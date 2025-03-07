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

// 代理转发百度 API 请求
router.post('/chat/proxy', async (req, res) => {
    try {
        const { message, userId, threadId } = req.body;
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

        // 直接返回响应，不再过滤
        console.log('Step 5 - Sending final response to client');
        res.json({
            success: true,
            message: botResponse,
            threadId: data.data?.threadId,
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

// 清除用户对话历史
router.delete('/chat/history/:userId', (req, res) => {
    const { userId } = req.params;

    res.json({
        success: true,
        message: '对话历史已清除'
    });
});

module.exports = router; 