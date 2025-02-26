const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fetch = require('node-fetch');  // 确保安装了 node-fetch

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

        const [users] = await db.execute(
            'SELECT user_tags FROM Users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const tags = users[0].user_tags ? users[0].user_tags.split(',') : [];

        res.json({
            success: true,
            data: {
                tags
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

// 保存聊天消息
router.post('/chat/messages', async (req, res) => {
    try {
        const { userId, message, messageType = 'text', isBot = false } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                message: '无效的参数'
            });
        }

        // 插入消息记录
        const [result] = await db.execute(
            `INSERT INTO chat_messages 
            (user_id, bot_id, message, message_type, status) 
            VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                isBot ? 1 : 0,  // bot_id: 1 表示性格测试智能体，0 表示用户消息
                message,
                messageType,
                'sent'  // 初始状态为已发送
            ]
        );

        res.json({
            success: true,
            message: '消息保存成功',
            data: {
                messageId: result.insertId,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('保存消息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取聊天历史
router.get('/chat/messages/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const [messages] = await db.execute(
            'SELECT * FROM chat_messages WHERE user_id = ? AND is_deleted = FALSE ORDER BY timestamp ASC',
            [userId]
        );

        res.json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('获取消息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 删除用户的聊天记录
router.delete('/chat/messages/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        await db.execute(
            'UPDATE chat_messages SET is_deleted = TRUE WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: '消息删除成功'
        });
    } catch (error) {
        console.error('删除消息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 代理转发百度 API 请求
router.post('/chat/proxy', async (req, res) => {
    try {
        const { message, userId, threadId } = req.body;  // 从请求中获取 threadId
        const appId = 'XWahSwAVRT6xrylMQ2jNDqh3khsbVzdE';
        const secretKey = 'xk2PgqDNrIUthoQrQ8zaVUXyqhRsw9Zu';

        console.log('Received request:', { message, userId, threadId });

        // 构建请求体，严格按照API文档格式
        const requestBody = {
            message: {
                content: {
                    type: "text",
                    value: {
                        showText: message
                    }
                }
            },
            source: appId,
            from: "openapi",
            openId: userId || 'default_user'
        };

        // 如果有 threadId，添加到请求体中
        if (threadId) {
            requestBody.threadId = threadId;
        }

        // 打印实际发送的请求体，用于调试
        console.log('Actual request body:', JSON.stringify(requestBody));

        const apiUrl = `https://agentapi.baidu.com/assistant/getAnswer?appId=${appId}&secretKey=${secretKey}`;

        console.log('Step 1 - Sending request to API:', {
            url: apiUrl,
            body: JSON.stringify(requestBody, null, 2)
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const rawResponse = await response.text();
        console.log('Step 2 - Raw API Response:', rawResponse);

        if (!response.ok) {
            console.error('API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: rawResponse
            });
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        let data;
        try {
            data = JSON.parse(rawResponse);
            console.log('Step 3 - Parsed API Response:', JSON.stringify(data, null, 2));
        } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            throw new Error('无法解析API响应JSON');
        }

        // 检查API响应状态
        if (data.status !== 0) {
            throw new Error(data.message || 'API调用失败');
        }

        // 提取回复内容
        let botResponse = null;
        if (data.data && data.data.content && Array.isArray(data.data.content)) {
            const textContent = data.data.content.find(item => item.dataType === 'txt');
            if (textContent && textContent.data) {
                botResponse = textContent.data;
            }
        }

        if (!botResponse) {
            console.error('无法找到有效的回复内容:', data);
            throw new Error('无法从API响应中提取文本内容');
        }

        console.log('Step 4 - Extracted response:', botResponse);

        // 保存机器人的回复到数据库
        console.log('Step 5 - Saving bot response to database');
        const [saveResult] = await db.execute(
            `INSERT INTO chat_messages 
            (user_id, bot_id, message, message_type, status) 
            VALUES (?, ?, ?, ?, ?)`,
            [userId, 1, botResponse, 'text', 'sent']
        );

        console.log('Step 6 - Sending final response to client');
        res.json({
            success: true,
            message: botResponse,
            threadId: data.data?.threadId,
            messageId: saveResult.insertId,
            timestamp: new Date()
        });

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

module.exports = router; 