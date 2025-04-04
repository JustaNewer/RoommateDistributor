const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fetch = require('node-fetch');  // 确保安装了 node-fetch
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: 'src/server/.env' });

// 存储对话历史
const conversationHistories = {};

// DeepSeek API 配置 - 从环境变量中读取
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL;

// 性格测试系统提示词
const SYSTEM_PROMPT = `#人物设定
你的工作是采访即将进入新宿舍住户的问卷调查员，你的任务是研究即将进入新宿舍的那些住户的特点，生活习惯等特征，以便后续能将他们更好地分配到一间宿舍，让住户有更好的宿舍体验

#提问规范
注意：问题要一个一个问，不要一起问多个问题
1.开始时你和用户说："我是宿舍问卷调查助手，接下来我会问您几个关于您个人的问题，以便于后续舍友的分配。"
2.提问规范:问题一定要有逻辑，这点很重要！
3.你必须至少问5个问题才能结束对话。当用户回答完第5个问题后，再询问一个"是否还有其他需要补充的信息？"，用户回答后你才能总结标签。如果没有达到至少5个问题的要求，用户又说不想再回答这一类问题之类的信息，你就和用户说调查还没结束，一定要礼貌地说明还需要回答更多问题
4.在调研时不要问为什么之类的话题，也就是不要问原因类的问题
5.提问一定要一个一个问题地问，不要一次问好几个问题
6.如果用户回答你问题的答案偏离了你的问题，你就礼貌地提醒用户重新回答一遍。
7.你需要记录已经问了多少个问题，确保至少问了5个问题才能结束对话
8.总结标签只能在用户回答完第5个问题并回答了"是否还有其他需要补充的信息？"之后才能给出
9.切记：第5个问题必须只包含问题，不要在提问的同时给出标签，必须等待用户回答后再给出标签

#调研结束
当用户回答了至少5个问题，并回答了"是否还有其他需要补充的信息？"这个问题后，你才能在下一条消息中给出标签，例如：#乐观 #阳光 #爱干净（这点很重要！！！）
注意：标签一定要在前面加一个"#"符号，每个标签的结尾一定要用空格隔开，这两步很重要! 而且问卷结束后一定要给出标签
问卷结束后只要说明一下问卷结束，然后输出标签就行了，标签数量应该在3-5个之间
再次强调：不要在问第5个问题的同时给出标签，必须等用户回答完第5个问题并回答了"是否还有其他需要补充的信息？"后，才能在下一条消息中给出总结标签`;

// 保存用户标签
router.post('/save-tags', async (req, res) => {
    try {
        const { userId, tags } = req.body;

        if (!userId || !tags || !Array.isArray(tags)) {
            return res.status(400).json({
                success: false,
                message: '无效的参数'
            });
        }

        // 将标签数组转换为空格分隔的字符串
        const tagsString = tags.join(' ');

        console.log('正在保存标签:', { userId, tags, tagsString });

        // 更新用户标签
        const [result] = await db.execute(
            'UPDATE Users SET user_tags = ? WHERE user_id = ?',
            [tagsString, userId]
        );

        if (result.affectedRows === 0) {
            throw new Error('未找到用户或标签未更新');
        }

        console.log('标签保存成功:', { userId, tagsString });

        res.json({
            success: true,
            message: '标签保存成功',
            data: {
                tags: tagsString
            }
        });
    } catch (error) {
        console.error('保存标签错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '服务器错误'
        });
    }
});

// 获取用户标签
router.get('/:userId/tags', async (req, res) => {
    try {
        const { userId } = req.params;

        console.log('获取用户标签，用户ID:', userId);

        const [users] = await db.execute(
            'SELECT user_tags FROM Users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            console.log('用户不存在:', userId);
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const userTags = users[0].user_tags ? users[0].user_tags.split(' ') : [];
        console.log('获取到的用户标签:', userTags);

        res.json({
            success: true,
            data: {
                user_tags: userTags  // 修改为 user_tags 以匹配前端期望的格式
            }
        });
    } catch (error) {
        console.error('获取标签错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 代理转发 DeepSeek API 请求
router.post('/chat/proxy', async (req, res) => {
    try {
        const { message, userId, conversationId } = req.body;

        console.log('Received request:', { message, userId, conversationId });

        // 检查环境变量是否正确加载
        if (!DEEPSEEK_API_KEY || !DEEPSEEK_API_URL || !DEEPSEEK_MODEL) {
            console.error('环境变量未正确加载:', {
                DEEPSEEK_API_KEY: DEEPSEEK_API_KEY ? '已设置' : '未设置',
                DEEPSEEK_API_URL: DEEPSEEK_API_URL ? '已设置' : '未设置',
                DEEPSEEK_MODEL: DEEPSEEK_MODEL ? '已设置' : '未设置'
            });
            throw new Error('DeepSeek API 配置未正确加载，请检查环境变量');
        }

        // 初始化或获取用户的对话历史
        if (!conversationHistories[userId]) {
            conversationHistories[userId] = [];
            // 添加系统提示词作为第一条消息
            conversationHistories[userId].push({
                role: 'system',
                content: SYSTEM_PROMPT
            });
        }

        // 添加用户消息到历史
        conversationHistories[userId].push({
            role: 'user',
            content: message
        });

        // 构建请求体
        const requestBody = {
            model: DEEPSEEK_MODEL,
            messages: conversationHistories[userId],
            temperature: 0.7,
            max_tokens: 1000
        };

        console.log('Step 1 - Sending request to DeepSeek API');
        console.log('Using model:', requestBody.model);
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        // 设置超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId); // 清除超时

            const responseText = await response.text();
            console.log('Raw API Response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Step 2 - DeepSeek API Response:', JSON.stringify(data, null, 2));
            } catch (parseError) {
                console.error('Failed to parse API response as JSON:', parseError);
                throw new Error(`API响应解析失败: ${responseText.substring(0, 200)}...`);
            }

            if (!response.ok) {
                console.error('API Error Response:', data);
                throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
            }

            // 提取回复内容
            let botResponse = null;
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                botResponse = data.choices[0].message.content;
            }

            if (!botResponse) {
                console.error('无法找到有效的回复内容:', data);
                throw new Error('无法从API响应中提取文本内容');
            }

            console.log('Step 3 - Extracted response:', botResponse);

            // 添加机器人回复到历史
            conversationHistories[userId].push({
                role: 'assistant',
                content: botResponse
            });

            // 检查是否包含标签，如果包含则自动保存
            // 根据对话上下文确定是否应该处理标签
            const shouldProcessTags = () => {
                // 至少需要10条消息 (系统提示+5个问题+5个回答+最后询问+回答+总结)
                if (conversationHistories[userId].length < 12) {
                    return false;
                }

                // 检查最后一条之前的消息是否包含"是否还有其他需要补充的信息"
                // 通常在第5个问题被回答后会询问这个问题
                let hasAskedSupplementQuestion = false;
                for (let i = conversationHistories[userId].length - 4; i >= 0; i--) {
                    const message = conversationHistories[userId][i];
                    if (message.role === 'assistant' &&
                        message.content.includes('还有其他需要补充的信息') ||
                        message.content.includes('其他想补充的信息')) {
                        hasAskedSupplementQuestion = true;
                        break;
                    }
                }

                return hasAskedSupplementQuestion;
            };

            if (botResponse.includes('#') && shouldProcessTags()) {
                const tags = botResponse.match(/#([^#\s,.!?，。！？]+)/g)?.map(tag => tag.slice(1)) || [];

                if (tags.length > 0) {
                    try {
                        console.log('检测到标签，自动保存:', tags);

                        // 确保标签数量在合理范围内
                        const validTags = tags.slice(0, Math.min(tags.length, 5));
                        console.log('有效标签:', validTags);

                        // 更新用户标签
                        const [result] = await db.execute(
                            'UPDATE Users SET user_tags = ? WHERE user_id = ?',
                            [validTags.join(' '), userId]
                        );

                        console.log('标签自动保存结果:', result);

                        if (result.affectedRows === 0) {
                            console.warn('未能更新用户标签，可能用户ID不存在:', userId);
                        } else {
                            console.log('标签自动保存成功');
                        }
                    } catch (tagError) {
                        console.error('自动保存标签错误:', tagError);
                    }
                }
            }

            // 限制历史长度，避免过长
            if (conversationHistories[userId].length > 50) {
                // 保留系统提示词和最近的消息
                const systemMessage = conversationHistories[userId][0];
                conversationHistories[userId] = [
                    systemMessage,
                    ...conversationHistories[userId].slice(-49)
                ];
            }

            // 返回响应
            console.log('Step 4 - Sending final response to client');
            res.json({
                success: true,
                message: botResponse,
                conversationId: data.id || 'deepseek-conversation',
                timestamp: new Date()
            });
        } catch (fetchError) {
            clearTimeout(timeoutId); // 确保清除超时

            if (fetchError.name === 'AbortError') {
                throw new Error('API请求超时，请稍后重试');
            }

            throw fetchError; // 重新抛出错误，由外层 catch 处理
        }
    } catch (error) {
        console.error('代理请求错误:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 清除用户对话历史
router.delete('/chat/history/:userId', (req, res) => {
    const { userId } = req.params;

    if (conversationHistories[userId]) {
        delete conversationHistories[userId];
    }

    res.json({
        success: true,
        message: '对话历史已清除'
    });
});

module.exports = router; 