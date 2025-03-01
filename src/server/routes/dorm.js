const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateDormHash } = require('../utils/dorm');

// 创建宿舍
router.post('/create', async (req, res) => {
    try {
        const {
            dormName,
            schoolName,
            space,
            floorCount,
            roomsPerFloor,
            userId  // 从请求中获取创建者ID
        } = req.body;

        // 验证必要字段
        if (!dormName || !schoolName || !space || !floorCount || !roomsPerFloor || !userId) {
            return res.status(400).json({
                success: false,
                message: '请填写所有必要信息'
            });
        }

        // 验证宿舍容量
        if (![2, 4, 6, 8].includes(Number(space))) {
            return res.status(400).json({
                success: false,
                message: '宿舍容量必须是2、4、6或8人'
            });
        }

        // 验证数值字段为正整数
        if (floorCount < 1 || roomsPerFloor < 1) {
            return res.status(400).json({
                success: false,
                message: '楼层数和每层房间数必须大于0'
            });
        }

        // 生成宿舍哈希
        const dormHash = generateDormHash({
            dormName,
            schoolName,
            space,
            floorCount,
            roomsPerFloor,
            userId
        });

        // 插入宿舍数据
        const [result] = await db.execute(
            `INSERT INTO Dorms 
            (dorm_name, creator_user_id, dorm_hash, school_name, space, floor_count, rooms_per_floor) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [dormName, userId, dormHash, schoolName, space, floorCount, roomsPerFloor]
        );

        res.status(201).json({
            success: true,
            message: '宿舍创建成功',
            data: {
                dormId: result.insertId,
                dormHash
            }
        });
    } catch (error) {
        console.error('创建宿舍错误:', error);

        // 处理唯一键冲突
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: '宿舍哈希重复，请重试'
            });
        }

        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取用户创建的宿舍
router.get('/created/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // 联合查询获取宿舍信息和创建者信息
        const [dorms] = await db.execute(
            `SELECT 
                d.dorm_id,
                d.dorm_name,
                d.school_name,
                d.space,
                d.floor_count,
                d.rooms_per_floor,
                d.dorm_hash as hash,
                u.username as creator_name,
                u.avatar_url as creator_avatar
             FROM Dorms d 
             LEFT JOIN Users u ON d.creator_user_id = u.user_id 
             WHERE d.creator_user_id = ?
             ORDER BY d.dorm_id DESC`,
            [userId]
        );

        console.log('查询到的宿舍:', dorms); // 添加日志以便调试

        res.json({
            success: true,
            data: dorms
        });
    } catch (error) {
        console.error('获取宿舍列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;