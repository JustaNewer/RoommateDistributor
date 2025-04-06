const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { hashPassword } = require('../utils/crypto');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// 设置JWT过期时间
const JWT_EXPIRES_IN = '24h'; // 令牌24小时后过期

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

        // 创建JWT令牌
        const token = jwt.sign(
            { userId: users[0].user_id, username: users[0].username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // 登录成功
        res.json({
            success: true,
            message: '登录成功',
            user: {
                id: users[0].user_id,
                username: users[0].username
            },
            token: token,
            expiresIn: JWT_EXPIRES_IN
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 验证令牌
router.get('/verify-token', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '未提供令牌'
            });
        }

        // 验证令牌
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: '令牌无效或已过期'
                });
            }

            return res.json({
                success: true,
                message: '令牌有效',
                user: {
                    id: decoded.userId,
                    username: decoded.username
                }
            });
        });
    } catch (error) {
        console.error('验证令牌错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 用户登出
router.post('/logout', (req, res) => {
    // 客户端需要删除令牌，服务器端不需要执行特殊操作
    // 因为我们使用的是无状态JWT令牌
    res.json({
        success: true,
        message: '已成功登出'
    });
});

// 修改密码
router.post('/change-password', async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;

        // 验证参数
        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        // 验证旧密码是否正确
        const hashedOldPassword = hashPassword(oldPassword);
        const [users] = await db.execute(
            'SELECT user_id FROM Users WHERE user_id = ? AND password = ?',
            [userId, hashedOldPassword]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '当前密码错误'
            });
        }

        // 更新新密码
        const hashedNewPassword = hashPassword(newPassword);
        await db.execute(
            'UPDATE Users SET password = ? WHERE user_id = ?',
            [hashedNewPassword, userId]
        );

        res.json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router; 