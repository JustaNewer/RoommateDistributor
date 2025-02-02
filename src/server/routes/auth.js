const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { hashPassword } = require('../utils/crypto');

// 用户注册
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证用户名和密码是否存在
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        // 检查用户名是否已存在
        const [existingUsers] = await db.execute(
            'SELECT username FROM Users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 对密码进行SHA256加密
        const hashedPassword = hashPassword(password);

        // 插入新用户
        await db.execute(
            'INSERT INTO Users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: '注册成功'
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证用户名和密码是否存在
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        // 对输入的密码进行SHA256加密
        const hashedPassword = hashPassword(password);

        // 查询用户
        const [users] = await db.execute(
            'SELECT user_id, username FROM Users WHERE username = ? AND password = ?',
            [username, hashedPassword]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 登录成功
        res.json({
            success: true,
            message: '登录成功',
            user: {
                id: users[0].user_id,
                username: users[0].username
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router; 