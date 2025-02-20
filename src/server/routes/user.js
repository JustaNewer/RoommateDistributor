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

        // 将标签数组转换为逗号分隔的字符串
        const tagsString = tags.join(',');

        // 更新用户标签
        await db.execute(
            'UPDATE Users SET user_tags = ? WHERE user_id = ?',
            [tagsString, userId]
        );

        res.json({
            success: true,
            message: '标签保存成功'
        });
    } catch (error) {
        console.error('保存标签错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
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
        await db.execute(
            'INSERT INTO chat_messages (user_id, bot_id, message, message_type) VALUES (?, ?, ?, ?)',
            [userId, 1, message, messageType] // bot_id 设为1，表示性格测试智能体
        );

        res.json({
            success: true,
            message: '消息保存成功'
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
        const { message, userId } = req.body;
        const appId = 'XWahSwAVRT6xrylMQ2jNDqh3khsbVzdE';
        const secretKey = 'xk2PgqDNrIUthoQrQ8zaVUXyqhRsw9Zu';

        console.log('Received request:', { message, userId });

        // 构建请求体，完全按照文档格式
        const requestBody = {
            message: {
                content: {
                    type: "text",
                    value: {
                        showText: message
                    }
                }
            },
            source: "XWahSwAVRT6xrylMQ2jNDqh3khsbVzdE",
            from: "openapi",
            openId: userId || 'default_user'
        };

        // 如果有会话ID，添加到请求中
        if (req.body.threadId) {
            requestBody.threadId = req.body.threadId;
        }

        const apiUrl = 'https://agentapi.baidu.com/assistant/getAnswer';

        console.log('Sending request to Baidu API:', {
            url: `${apiUrl}?appId=${appId}&secretKey=${secretKey}`,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody, null, 2)
        });

        const response = await fetch(
            `${apiUrl}?appId=${appId}&secretKey=${secretKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const responseText = await response.text();
        console.log('Raw API Response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
            console.log('Parsed API Response:', JSON.stringify(data, null, 2));
        } catch (parseError) {
            console.error('Failed to parse API response:', parseError);
            throw new Error(`无法解析API响应: ${responseText}`);
        }

        // 检查响应状态
        if (data.status !== 0) {
            throw new Error(`API错误: ${data.message}`);
        }

        // 从响应中提取文本内容
        let botResponse = '';

        if (data.data && Array.isArray(data.data.content)) {
            const textContent = data.data.content.find(item =>
                item.dataType === 'text' || item.dataType === 'markdown'
            );
            if (textContent && textContent.data && textContent.data.text) {
                botResponse = textContent.data.text;
            }
        }

        if (!botResponse) {
            console.error('Could not find response in data:', JSON.stringify(data, null, 2));
            throw new Error('无法从API响应中提取文本内容');
        }

        console.log('Final bot response:', botResponse);

        res.json({
            success: true,
            message: botResponse,
            threadId: data.data.threadId
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