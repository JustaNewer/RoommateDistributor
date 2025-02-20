const express = require('express');
const router = express.Router();
const multer = require('multer');
const OSS = require('ali-oss');
const db = require('../config/db');
const ossConfig = require('../config/oss');

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

module.exports = router; 