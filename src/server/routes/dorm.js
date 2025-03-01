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

module.exports = router;