const express = require('express');
const router = express.Router();
const multer = require('multer');
const OSS = require('ali-oss');
const db = require('../config/db');
const ossConfig = require('../config/oss');
const fetch = require('node-fetch');

// 配置阿里云 OSS
const client = new OSS(ossConfig);

// 配置 multer 用于处理文件上传
const upload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制文件大小为 5MB
    }
});

// 上传头像
router.post('/upload', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的图片'
            });
        }

        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '用户ID不能为空'
            });
        }

        // 生成文件名
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `avatars/${userId}_${Date.now()}.${fileExt}`;

        // 上传到阿里云 OSS
        const result = await client.put(fileName, req.file.buffer);

        // 更新数据库中的头像 URL
        await db.execute(
            'UPDATE Users SET avatar_url = ? WHERE user_id = ?',
            [result.url, userId]
        );

        res.json({
            success: true,
            message: '头像上传成功',
            data: {
                avatarUrl: result.url
            }
        });
    } catch (error) {
        console.error('头像上传错误:', error);
        res.status(500).json({
            success: false,
            message: '头像上传失败'
        });
    }
});

// 获取头像
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const [users] = await db.execute(
            'SELECT avatar_url FROM Users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: {
                avatarUrl: users[0].avatar_url
            }
        });
    } catch (error) {
        console.error('获取头像错误:', error);
        res.status(500).json({
            success: false,
            message: '获取头像失败'
        });
    }
});

// AI生成头像
router.post('/generate', async (req, res) => {
    try {
        const { userId, prompt } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '用户ID不能为空'
            });
        }

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                success: false,
                message: '请输入头像描述'
            });
        }

        console.log('开始生成AI头像，用户ID:', userId, '提示词:', prompt);

        // 构建优化的头像生成prompt
        const enhancedPrompt = `${prompt}, high quality portrait, professional avatar, clean background, centered composition`;

        // 调用硅基流动API生成图片（完全按照官方文档示例）
        const apiKey = 'sk-kehflmxjdubzayussxtdvqozvmpfdehejpiwpynsbqgtvhbr';
        const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'Kwai-Kolors/Kolors',
                prompt: enhancedPrompt,
                image_size: '1024x1024',
                batch_size: 1,
                num_inference_steps: 20,
                guidance_scale: 7.5
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('硅基流动API错误:', errorData);
            throw new Error(errorData.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        console.log('硅基流动API响应:', JSON.stringify(data, null, 2));

        if (!data.images || !data.images[0] || !data.images[0].url) {
            throw new Error('API返回数据格式错误');
        }

        const imageUrl = data.images[0].url;
        console.log('获取到生成的图片URL:', imageUrl);

        // 下载生成的图片
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('下载生成的图片失败');
        }

        const imageBuffer = await imageResponse.buffer();
        console.log('图片下载成功，大小:', imageBuffer.length, 'bytes');

        // 上传到阿里云OSS
        const fileName = `avatars/ai_${userId}_${Date.now()}.png`;
        console.log('开始上传到OSS，文件名:', fileName);
        
        const result = await client.put(fileName, imageBuffer);
        console.log('OSS上传成功，URL:', result.url);

        // 更新数据库中的头像URL
        const [updateResult] = await db.execute(
            'UPDATE Users SET avatar_url = ? WHERE user_id = ?',
            [result.url, userId]
        );

        console.log('数据库更新结果:', updateResult);

        res.json({
            success: true,
            message: 'AI头像生成成功',
            data: {
                avatarUrl: result.url
            }
        });
    } catch (error) {
        console.error('AI生成头像错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'AI生成头像失败，请稍后重试'
        });
    }
});

module.exports = router; 
