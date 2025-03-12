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

        // 开始数据库事务
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
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
            const [dormResult] = await connection.execute(
                `INSERT INTO Dorms 
                (dorm_name, creator_user_id, dorm_hash, school_name, space, floor_count, rooms_per_floor) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [dormName, userId, dormHash, schoolName, space, floorCount, roomsPerFloor]
            );

            const dormId = dormResult.insertId;

            // 批量插入房间数据
            const roomValues = [];
            const roomParams = [];

            // 为每层楼生成房间数据
            for (let floor = 1; floor <= floorCount; floor++) {
                for (let room = 1; room <= roomsPerFloor; room++) {
                    // 生成房间号，例如：101, 102, 201, 202等
                    const roomNumber = `${floor}${String(room).padStart(2, '0')}`;
                    roomValues.push('(?, ?, ?, ?)');
                    roomParams.push(
                        dormId,
                        roomNumber,
                        space, // capacity等于宿舍的space
                        0     // current_occupants默认为0
                    );
                }
            }

            // 批量插入所有房间记录
            if (roomValues.length > 0) {
                const roomSql = `
                    INSERT INTO Rooms 
                    (dorm_id, room_number, capacity, current_occupants) 
                    VALUES ${roomValues.join(',')}
                `;
                await connection.execute(roomSql, roomParams);
            }

            // 提交事务
            await connection.commit();

            res.status(201).json({
                success: true,
                message: '宿舍创建成功',
                data: {
                    dormId,
                    dormHash
                }
            });
        } catch (error) {
            // 如果出错，回滚事务
            await connection.rollback();
            throw error;
        } finally {
            // 释放连接
            connection.release();
        }
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
                d.creator_user_id,
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

// 获取宿舍详情
router.get('/:dormId', async (req, res) => {
    try {
        const { dormId } = req.params;

        // 获取宿舍基本信息
        const [dorms] = await db.execute(
            `SELECT 
                dorm_id,
                dorm_name,
                school_name,
                space,
                floor_count,
                rooms_per_floor
             FROM Dorms
             WHERE dorm_id = ?`,
            [dormId]
        );

        if (dorms.length === 0) {
            return res.status(404).json({
                success: false,
                message: '宿舍不存在'
            });
        }

        const dormData = dorms[0];

        res.json({
            success: true,
            data: dormData
        });
    } catch (error) {
        console.error('获取宿舍详情错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取宿舍入住情况
router.get('/occupancy/:dormId', async (req, res) => {
    try {
        const { dormId } = req.params;

        // 获取入住情况
        const [occupancy] = await db.execute(
            `SELECT room_number, bed_number 
             FROM DormOccupancy 
             WHERE dorm_id = ? AND is_occupied = 1`,
            [dormId]
        );

        // 将入住数据转换为前端需要的格式
        const occupancyMap = {};
        occupancy.forEach(record => {
            const floor = Math.floor(record.room_number / 100);
            const room = record.room_number % 100;
            const key = `${floor}-${room}`;
            if (!occupancyMap[key]) {
                occupancyMap[key] = [];
            }
            occupancyMap[key].push(record.bed_number);
        });

        res.json({
            success: true,
            data: {
                occupancy: occupancyMap
            }
        });
    } catch (error) {
        console.error('获取入住情况错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 删除宿舍
router.delete('/:dormId', async (req, res) => {
    try {
        const { dormId } = req.params;

        // 首先检查宿舍是否存在
        const [dorms] = await db.execute(
            'SELECT creator_user_id FROM Dorms WHERE dorm_id = ?',
            [dormId]
        );

        if (dorms.length === 0) {
            return res.status(404).json({
                success: false,
                message: '宿舍不存在'
            });
        }

        // 开始事务
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. 先删除与该宿舍关联的床位分配记录
            await connection.execute(
                'DELETE FROM DormOccupants WHERE room_id IN (SELECT room_id FROM Rooms WHERE dorm_id = ?)',
                [dormId]
            );

            // 2. 删除与该宿舍关联的房间记录
            await connection.execute(
                'DELETE FROM Rooms WHERE dorm_id = ?',
                [dormId]
            );

            // 3. 最后删除宿舍
            const [result] = await connection.execute(
                'DELETE FROM Dorms WHERE dorm_id = ?',
                [dormId]
            );

            // 提交事务
            await connection.commit();
            connection.release();

            if (result.affectedRows > 0) {
                res.json({
                    success: true,
                    message: '宿舍删除成功'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: '删除失败'
                });
            }
        } catch (error) {
            // 如果出错，回滚事务
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('删除宿舍错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});

// 搜索宿舍
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;

        // 如果查询为空，返回空结果
        if (!query || query.trim() === '') {
            return res.json({
                success: true,
                data: []
            });
        }

        // 使用LIKE进行模糊搜索，匹配宿舍名称、学校名称或宿舍哈希码
        const searchQuery = `%${query}%`;

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
                d.creator_user_id,
                u.username as creator_name,
                u.avatar_url as creator_avatar
             FROM Dorms d 
             LEFT JOIN Users u ON d.creator_user_id = u.user_id 
             WHERE d.dorm_name LIKE ? 
                OR d.school_name LIKE ? 
                OR d.dorm_hash LIKE ?
             ORDER BY d.dorm_id DESC`,
            [searchQuery, searchQuery, searchQuery]
        );

        console.log('搜索结果:', dorms); // 添加日志以便调试

        res.json({
            success: true,
            data: dorms
        });
    } catch (error) {
        console.error('搜索宿舍错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 更新宿舍
router.put('/update/:dormId', async (req, res) => {
    try {
        const { dormId } = req.params;
        const {
            dormName,
            schoolName,
            space,
            floorCount,
            roomsPerFloor,
            userId,
            originalSpace,
            originalRoomsPerFloor
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

        // 首先检查宿舍是否存在且用户是否为创建者
        const [dorms] = await db.execute(
            'SELECT creator_user_id FROM Dorms WHERE dorm_id = ?',
            [dormId]
        );

        if (dorms.length === 0) {
            return res.status(404).json({
                success: false,
                message: '宿舍不存在'
            });
        }

        if (dorms[0].creator_user_id !== Number(userId)) {
            return res.status(403).json({
                success: false,
                message: '您没有权限修改此宿舍'
            });
        }

        // 开始数据库事务
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. 更新宿舍基本信息
            await connection.execute(
                `UPDATE Dorms 
                SET dorm_name = ?, school_name = ?, space = ?, floor_count = ?, rooms_per_floor = ? 
                WHERE dorm_id = ?`,
                [dormName, schoolName, space, floorCount, roomsPerFloor, dormId]
            );

            // 2. 处理房间数量变化
            if (Number(roomsPerFloor) !== Number(originalRoomsPerFloor)) {
                // 获取当前所有房间
                const [rooms] = await connection.execute(
                    'SELECT room_id, room_number FROM Rooms WHERE dorm_id = ? ORDER BY room_number',
                    [dormId]
                );

                // 如果减少了房间数
                if (Number(roomsPerFloor) < Number(originalRoomsPerFloor)) {
                    // 按楼层分组房间
                    const roomsByFloor = {};
                    rooms.forEach(room => {
                        const floor = Math.floor(room.room_number / 100);
                        if (!roomsByFloor[floor]) {
                            roomsByFloor[floor] = [];
                        }
                        roomsByFloor[floor].push(room);
                    });

                    // 对每层删除多余的房间
                    for (const floor in roomsByFloor) {
                        if (roomsByFloor[floor].length > roomsPerFloor) {
                            // 获取要删除的房间（保留前roomsPerFloor个房间，删除其余的）
                            const roomsToKeep = roomsByFloor[floor].slice(0, roomsPerFloor);
                            const roomsToDelete = roomsByFloor[floor].slice(roomsPerFloor);
                            const roomIdsToDelete = roomsToDelete.map(room => room.room_id);

                            console.log(`楼层 ${floor} 保留房间: ${roomsToKeep.map(r => r.room_number).join(', ')}`);
                            console.log(`楼层 ${floor} 删除房间: ${roomsToDelete.map(r => r.room_number).join(', ')}`);

                            // 删除这些房间的入住记录
                            if (roomIdsToDelete.length > 0) {
                                await connection.execute(
                                    `DELETE FROM DormOccupants WHERE room_id IN (${roomIdsToDelete.join(',')})`,
                                    []
                                );

                                // 删除房间
                                await connection.execute(
                                    `DELETE FROM Rooms WHERE room_id IN (${roomIdsToDelete.join(',')})`,
                                    []
                                );
                            }
                        }
                    }
                }
                // 如果增加了房间数
                else if (Number(roomsPerFloor) > Number(originalRoomsPerFloor)) {
                    // 按楼层分组获取最大房间号
                    const maxRoomNumberByFloor = {};
                    rooms.forEach(room => {
                        const floor = Math.floor(room.room_number / 100);
                        const roomNumber = room.room_number % 100;
                        if (!maxRoomNumberByFloor[floor] || roomNumber > maxRoomNumberByFloor[floor]) {
                            maxRoomNumberByFloor[floor] = roomNumber;
                        }
                    });

                    // 为每层添加新房间
                    for (let floor = 1; floor <= floorCount; floor++) {
                        // 获取当前楼层已有的房间数
                        const floorRooms = rooms.filter(room => Math.floor(room.room_number / 100) === floor);
                        const currentRoomCount = floorRooms.length;
                        const roomsToAdd = roomsPerFloor - currentRoomCount;

                        console.log(`楼层 ${floor} 当前房间数: ${currentRoomCount}, 需要添加: ${roomsToAdd}`);

                        if (roomsToAdd > 0) {
                            const roomValues = [];
                            const roomParams = [];

                            // 找出当前楼层最大的房间号
                            const maxRoomNumber = maxRoomNumberByFloor[floor] || 0;

                            for (let i = 1; i <= roomsToAdd; i++) {
                                const newRoomNumber = maxRoomNumber + i;
                                const formattedRoomNumber = parseInt(`${floor}${String(newRoomNumber).padStart(2, '0')}`);
                                roomValues.push('(?, ?, ?, ?)');
                                roomParams.push(
                                    dormId,
                                    formattedRoomNumber,
                                    space, // capacity等于宿舍的space
                                    0     // current_occupants默认为0
                                );
                            }

                            if (roomValues.length > 0) {
                                const roomSql = `
                                    INSERT INTO Rooms 
                                    (dorm_id, room_number, capacity, current_occupants) 
                                    VALUES ${roomValues.join(',')}
                                `;
                                await connection.execute(roomSql, roomParams);
                            }
                        }
                    }
                }
            }

            // 3. 处理房间容量变化
            if (Number(space) !== Number(originalSpace)) {
                await connection.execute(
                    'UPDATE Rooms SET capacity = ? WHERE dorm_id = ?',
                    [space, dormId]
                );
            }

            // 提交事务
            await connection.commit();

            res.json({
                success: true,
                message: '宿舍更新成功'
            });
        } catch (error) {
            // 如果出错，回滚事务
            await connection.rollback();
            throw error;
        } finally {
            // 释放连接
            connection.release();
        }
    } catch (error) {
        console.error('更新宿舍错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});

module.exports = router;