const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateProfile } = require('../utils/personalityProfile');

// 获取用户性格画像（user_tags 现在存储完整的自然语言性格描述，由问卷测试自动生成）
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

        const profile = users[0].user_tags || '';

        res.json({
            success: true,
            data: {
                user_tags: profile ? [profile] : [],
                profile: profile
            }
        });
    } catch (error) {
        console.error('获取性格画像错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取用户基本信息（profile 表单）
router.get('/:userId/profile', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await db.execute(
            'SELECT real_name, height, weight, gender, sleep_time_start, sleep_time_end, has_nap, nap_time_start, nap_time_end FROM Users WHERE user_id = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 保存用户基本信息
router.put('/:userId/profile', async (req, res) => {
    try {
        const { userId } = req.params;
        const { real_name, height, weight, gender, sleep_time_start, sleep_time_end, has_nap, nap_time_start, nap_time_end } = req.body;
        const [result] = await db.execute(
            'UPDATE Users SET real_name = ?, height = ?, weight = ?, gender = ?, sleep_time_start = ?, sleep_time_end = ?, has_nap = ?, nap_time_start = ?, nap_time_end = ? WHERE user_id = ?',
            [
                real_name || null,
                height || null,
                weight || null,
                gender || null,
                sleep_time_start || null,
                sleep_time_end || null,
                has_nap ? 1 : 0,
                (has_nap && nap_time_start) ? nap_time_start : null,
                (has_nap && nap_time_end) ? nap_time_end : null,
                userId
            ]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        res.json({ success: true, message: '信息保存成功' });
    } catch (error) {
        console.error('保存用户信息错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 保存问卷测试结果（user_vector）并自动生成确定性性格画像
router.post('/save-vector', async (req, res) => {
    try {
        const { userId, vector } = req.body;

        if (!userId || !vector || !Array.isArray(vector) || vector.length !== 9) {
            return res.status(400).json({
                success: false,
                message: '无效的参数，需要9维向量'
            });
        }

        for (const v of vector) {
            if (typeof v !== 'number' || v < 1 || v > 5) {
                return res.status(400).json({
                    success: false,
                    message: '向量值必须在1-5之间'
                });
            }
        }

        const vectorString = JSON.stringify(vector);
        const profile = generateProfile(vector);

        const [result] = await db.execute(
            'UPDATE Users SET user_vector = ?, user_tags = ? WHERE user_id = ?',
            [vectorString, profile, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        console.log('向量与性格画像已保存:', { userId, vector, profile });

        res.json({
            success: true,
            message: '问卷结果保存成功',
            data: { vector, profile }
        });
    } catch (error) {
        console.error('保存问卷结果错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 根据已有向量重新生成性格画像（用于历史数据迁移）
router.post('/regenerate-profile', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: '缺少userId参数' });
        }

        const [users] = await db.execute(
            'SELECT user_vector FROM Users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        if (!users[0].user_vector) {
            return res.status(400).json({ success: false, message: '该用户尚未完成问卷测试' });
        }

        const vector = JSON.parse(users[0].user_vector);
        const profile = generateProfile(vector);

        await db.execute(
            'UPDATE Users SET user_tags = ? WHERE user_id = ?',
            [profile, userId]
        );

        res.json({
            success: true,
            message: '性格画像重新生成成功',
            data: { vector, profile }
        });
    } catch (error) {
        console.error('重新生成性格画像错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 批量重新生成所有用户的性格画像
router.post('/regenerate-all-profiles', async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT user_id, user_vector FROM Users WHERE user_vector IS NOT NULL'
        );

        let updated = 0;
        for (const user of users) {
            try {
                const vector = JSON.parse(user.user_vector);
                const profile = generateProfile(vector);
                if (profile) {
                    await db.execute(
                        'UPDATE Users SET user_tags = ? WHERE user_id = ?',
                        [profile, user.user_id]
                    );
                    updated++;
                }
            } catch (e) {
                console.error(`用户 ${user.user_id} 画像生成失败:`, e.message);
            }
        }

        res.json({
            success: true,
            message: `已为 ${updated}/${users.length} 个用户重新生成性格画像`
        });
    } catch (error) {
        console.error('批量生成性格画像错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取用户问卷向量
router.get('/:userId/vector', async (req, res) => {
    try {
        const { userId } = req.params;

        const [users] = await db.execute(
            'SELECT user_vector FROM Users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        const userVector = users[0].user_vector ? JSON.parse(users[0].user_vector) : null;

        res.json({
            success: true,
            data: { user_vector: userVector }
        });
    } catch (error) {
        console.error('获取问卷结果错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
