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

// 获取宿舍房间和入住状态
router.get('/room-status/:dormId', async (req, res) => {
    try {
        const { dormId } = req.params;

        // 获取宿舍信息
        const [dorms] = await db.execute(
            `SELECT 
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

        const dormInfo = dorms[0];

        // 获取所有房间及其入住情况
        const [rooms] = await db.execute(
            `SELECT 
                room_id,
                room_number,
                capacity,
                current_occupants
             FROM Rooms
             WHERE dorm_id = ?
             ORDER BY room_number ASC`,
            [dormId]
        );

        // 将房间数据按楼层组织
        const roomsByFloor = {};

        rooms.forEach(room => {
            // 分割房间号以获取楼层 (例如, 从101中获取1作为楼层)
            const floorNumber = Math.floor(room.room_number / 100);
            const roomNumber = room.room_number % 100;

            if (!roomsByFloor[floorNumber]) {
                roomsByFloor[floorNumber] = [];
            }

            roomsByFloor[floorNumber].push({
                room_id: room.room_id,
                room_number: room.room_number,
                room_display: roomNumber, // 显示用的房间号 (去掉楼层前缀)
                capacity: room.capacity,
                current_occupants: room.current_occupants,
                occupancy_percentage: Math.floor((room.current_occupants / room.capacity) * 100)
            });
        });

        res.json({
            success: true,
            data: {
                dorm_info: dormInfo,
                rooms_by_floor: roomsByFloor
            }
        });
    } catch (error) {
        console.error('获取房间入住状态错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取房间入住用户信息
router.get('/room-occupants/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;

        // 获取房间信息以确定总床位数
        const [roomInfo] = await db.execute(
            `SELECT capacity FROM Rooms WHERE room_id = ?`,
            [roomId]
        );

        if (roomInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: '房间不存在'
            });
        }

        // 获取房间入住用户信息
        const [occupants] = await db.execute(
            `SELECT 
                do.user_id,
                u.username,
                u.avatar_url
             FROM DormOccupants do
             JOIN Users u ON do.user_id = u.user_id
             WHERE do.room_id = ?`,
            [roomId]
        );

        const capacity = roomInfo[0].capacity;
        const occupantsByPosition = Array(capacity).fill(null);

        // 由于没有床位位置信息，简单地将用户按顺序分配到床位
        occupants.forEach((occupant, index) => {
            if (index < capacity) {
                occupantsByPosition[index] = {
                    user_id: occupant.user_id,
                    username: occupant.username,
                    avatar_url: occupant.avatar_url
                };
            }
        });

        res.json({
            success: true,
            data: {
                capacity: capacity,
                occupants: occupantsByPosition
            }
        });
    } catch (error) {
        console.error('获取房间入住用户信息错误:', error);
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

// 用户申请加入宿舍
router.post('/apply', async (req, res) => {
    try {
        const { dormId, userId } = req.body;

        // 验证必要字段
        if (!dormId || !userId) {
            return res.status(400).json({
                success: false,
                message: '请提供宿舍ID和用户ID'
            });
        }

        // 检查宿舍是否存在
        const [dorms] = await db.execute(
            'SELECT * FROM Dorms WHERE dorm_id = ?',
            [dormId]
        );

        if (dorms.length === 0) {
            return res.status(404).json({
                success: false,
                message: '宿舍不存在'
            });
        }

        // 检查用户是否存在
        const [users] = await db.execute(
            'SELECT * FROM Users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 检查是否是宿舍创建者
        if (dorms[0].creator_user_id === Number(userId)) {
            return res.status(400).json({
                success: false,
                message: '您是宿舍创建者，无需申请加入'
            });
        }

        // 检查是否已经申请过
        const [existingApplications] = await db.execute(
            'SELECT * FROM DormApplication WHERE dorm_id = ? AND user_id = ? AND application_status = "pending"',
            [dormId, userId]
        );

        if (existingApplications.length > 0) {
            return res.status(400).json({
                success: false,
                message: '您已经提交过申请，请等待处理'
            });
        }

        // 获取用户信息
        const user = users[0];
        const username = user.username;
        const userTags = user.user_tags || null;
        const avatarUrl = user.avatar_url || null;

        // 插入申请记录
        const [result] = await db.execute(
            'INSERT INTO DormApplication (dorm_id, user_id, username, user_tags, avatar_url, application_status) VALUES (?, ?, ?, ?, ?, "pending")',
            [dormId, userId, username, userTags, avatarUrl]
        );

        res.status(201).json({
            success: true,
            message: '申请已提交，等待宿舍管理员审核',
            data: {
                applicationId: result.insertId
            }
        });
    } catch (error) {
        console.error('提交申请错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取宿舍申请列表（宿舍创建者使用）
router.get('/applications/:dormId', async (req, res) => {
    try {
        const { dormId } = req.params;
        const { userId } = req.query; // 当前登录用户ID，用于验证权限

        // 验证权限（检查当前用户是否是宿舍创建者）
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

        // 验证当前用户是否是宿舍创建者
        if (dorms[0].creator_user_id !== Number(userId)) {
            return res.status(403).json({
                success: false,
                message: '您没有权限查看此宿舍的申请列表'
            });
        }

        // 获取待处理的申请列表
        const [applications] = await db.execute(
            `SELECT 
                a.application_id,
                a.user_id,
                a.username,
                a.user_tags,
                a.avatar_url,
                a.application_status,
                a.application_time
             FROM DormApplication a
             WHERE a.dorm_id = ? AND a.application_status = 'pending'
             ORDER BY a.application_time DESC`,
            [dormId]
        );

        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        console.error('获取申请列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取用户的申请状态
router.get('/application-status', async (req, res) => {
    try {
        const { userId, dormId } = req.query;

        if (!userId || !dormId) {
            return res.status(400).json({
                success: false,
                message: '请提供用户ID和宿舍ID'
            });
        }

        // 获取用户对特定宿舍的最新申请状态
        const [applications] = await db.execute(
            `SELECT 
                application_id,
                application_status,
                application_time
             FROM DormApplication 
             WHERE user_id = ? AND dorm_id = ?
             ORDER BY application_time DESC
             LIMIT 1`,
            [userId, dormId]
        );

        if (applications.length === 0) {
            return res.json({
                success: true,
                data: {
                    hasApplied: false
                }
            });
        }

        res.json({
            success: true,
            data: {
                hasApplied: true,
                status: applications[0].application_status,
                applicationTime: applications[0].application_time
            }
        });
    } catch (error) {
        console.error('获取申请状态错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取用户加入的宿舍
router.get('/joined/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '请提供用户ID'
            });
        }

        // 查询该用户加入的宿舍信息 (从DormOccupants表获取)
        const [joinedDorms] = await db.execute(
            `SELECT 
                o.dorm_id,
                o.room_id,
                d.dorm_name,
                d.school_name,
                d.space,
                d.floor_count,
                d.rooms_per_floor,
                d.dorm_hash as hash,
                r.room_number,
                u.username as creator_name,
                u.avatar_url as creator_avatar
             FROM DormOccupants o
             JOIN Dorms d ON o.dorm_id = d.dorm_id
             JOIN Rooms r ON o.room_id = r.room_id
             JOIN Users u ON d.creator_user_id = u.user_id
             WHERE o.user_id = ?
             ORDER BY o.dorm_id DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: joinedDorms
        });
    } catch (error) {
        console.error('获取已加入宿舍错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 更新用户加入宿舍状态 (当申请被批准后调用)
router.put('/application/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status, userId } = req.body; // status: 'approved' 或 'rejected'

        // 验证状态值
        if (status !== 'approved' && status !== 'rejected') {
            return res.status(400).json({
                success: false,
                message: '无效的状态值，必须是 approved 或 rejected'
            });
        }

        // 获取申请信息
        const [applications] = await db.execute(
            'SELECT * FROM DormApplication WHERE application_id = ?',
            [applicationId]
        );

        if (applications.length === 0) {
            return res.status(404).json({
                success: false,
                message: '申请不存在'
            });
        }

        const application = applications[0];

        // 验证权限（检查当前用户是否是宿舍创建者）
        const [dorms] = await db.execute(
            'SELECT creator_user_id FROM Dorms WHERE dorm_id = ?',
            [application.dorm_id]
        );

        if (dorms.length === 0) {
            return res.status(404).json({
                success: false,
                message: '宿舍不存在'
            });
        }

        // 验证当前用户是否是宿舍创建者
        if (dorms[0].creator_user_id !== Number(userId)) {
            return res.status(403).json({
                success: false,
                message: '您没有权限处理此申请'
            });
        }

        // 开始数据库事务
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 更新申请状态
            await connection.execute(
                'UPDATE DormApplication SET application_status = ? WHERE application_id = ?',
                [status, applicationId]
            );

            // 如果批准申请，将用户与宿舍关联
            if (status === 'approved') {
                // 首先查找有空位的房间
                const [availableRooms] = await connection.execute(
                    `SELECT 
                        room_id, 
                        room_number, 
                        capacity, 
                        current_occupants 
                     FROM Rooms 
                     WHERE dorm_id = ? AND current_occupants < capacity
                     ORDER BY room_number ASC
                     LIMIT 1`,
                    [application.dorm_id]
                );

                if (availableRooms.length === 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: '宿舍没有可用房间'
                    });
                }

                const room = availableRooms[0];

                // 将用户添加到DormOccupants表
                await connection.execute(
                    'INSERT INTO DormOccupants (dorm_id, user_id, room_id) VALUES (?, ?, ?)',
                    [application.dorm_id, application.user_id, room.room_id]
                );

                // 更新房间当前入住人数
                await connection.execute(
                    'UPDATE Rooms SET current_occupants = current_occupants + 1 WHERE room_id = ?',
                    [room.room_id]
                );

                // 更新用户表的dorm_id字段
                await connection.execute(
                    'UPDATE Users SET dorm_id = ? WHERE user_id = ?',
                    [application.dorm_id, application.user_id]
                );
            }

            // 提交事务
            await connection.commit();

            res.json({
                success: true,
                message: status === 'approved' ? '申请已批准' : '申请已拒绝'
            });
        } catch (error) {
            // 回滚事务
            await connection.rollback();
            throw error;
        } finally {
            // 释放连接
            connection.release();
        }
    } catch (error) {
        console.error('处理申请错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// AI分配舍友
router.post('/assign-roommates', async (req, res) => {
    try {
        const { dormId, userId } = req.body; // 宿舍ID和当前操作用户ID

        // 验证必要字段
        if (!dormId || !userId) {
            return res.status(400).json({
                success: false,
                message: '请提供宿舍ID和用户ID'
            });
        }

        // 验证权限（检查当前用户是否是宿舍创建者）
        const [dorms] = await db.execute(
            'SELECT creator_user_id, space FROM Dorms WHERE dorm_id = ?',
            [dormId]
        );

        if (dorms.length === 0) {
            return res.status(404).json({
                success: false,
                message: '宿舍不存在'
            });
        }

        // 验证当前用户是否是宿舍创建者
        if (dorms[0].creator_user_id !== Number(userId)) {
            return res.status(403).json({
                success: false,
                message: '您没有权限分配舍友'
            });
        }

        const roomCapacity = dorms[0].space; // 每个房间的容量

        // 获取该宿舍的所有待处理申请
        const [applications] = await db.execute(
            `SELECT 
                a.application_id,
                a.user_id,
                a.username,
                a.user_tags
             FROM DormApplication a
             WHERE a.dorm_id = ? AND a.application_status = 'pending'
             ORDER BY a.application_time ASC`,
            [dormId]
        );

        if (applications.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有待处理的申请'
            });
        }

        // 获取该宿舍的所有房间
        const [rooms] = await db.execute(
            `SELECT 
                room_id,
                room_number,
                capacity,
                current_occupants
             FROM Rooms
             WHERE dorm_id = ? AND current_occupants < capacity
             ORDER BY room_number ASC`,
            [dormId]
        );

        if (rooms.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有可用的房间'
            });
        }

        // 获取已有的标签及用户对象数组
        const applicants = applications.map(app => ({
            userId: app.user_id,
            username: app.username,
            applicationId: app.application_id,
            tags: app.user_tags ? app.user_tags.split(' ').map(tag =>
                tag.startsWith('#') ? tag : `#${tag}`
            ) : []
        }));

        // 调用DeepSeek API进行舍友匹配
        const roomAssignments = await assignRoommatesWithAI(applicants, rooms, roomCapacity);

        // 开始事务
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 处理分配结果
            for (const roomId in roomAssignments) {
                const userIds = roomAssignments[roomId];

                // 更新DormOccupants表
                for (const userId of userIds) {
                    // 插入新的记录
                    await connection.execute(
                        'INSERT INTO DormOccupants (dorm_id, user_id, room_id) VALUES (?, ?, ?)',
                        [dormId, userId, roomId]
                    );

                    // 更新申请状态为approved
                    await connection.execute(
                        'UPDATE DormApplication SET application_status = "approved" WHERE dorm_id = ? AND user_id = ?',
                        [dormId, userId]
                    );
                }

                // 更新房间当前入住人数
                await connection.execute(
                    'UPDATE Rooms SET current_occupants = current_occupants + ? WHERE room_id = ?',
                    [userIds.length, roomId]
                );
            }

            // 提交事务
            await connection.commit();

            res.status(200).json({
                success: true,
                message: '舍友分配成功',
                data: {
                    roomAssignments
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
        console.error('分配舍友错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});

// 使用DeepSeek API进行舍友匹配
async function assignRoommatesWithAI(applicants, rooms, roomCapacity) {
    // 如果申请人数少于等于一个房间容量，直接分配到一个房间
    if (applicants.length <= roomCapacity) {
        return {
            [rooms[0].room_id]: applicants.map(a => a.userId)
        };
    }

    try {
        // 准备向DeepSeek发送的数据
        const userTags = applicants.map(a => ({
            user_id: a.userId,
            username: a.username,
            tags: a.tags.join(' ')
        }));

        const availableRooms = rooms.map(r => ({
            room_id: r.room_id,
            room_number: r.room_number,
            available_spots: r.capacity - r.current_occupants
        }));

        // 构建提示文本
        const prompt = `
你是一个智能舍友匹配系统。我需要你根据用户的性格标签，将用户分配到合适的宿舍房间。
尽量将性格相似或互补的用户分在一起，避免可能发生冲突的性格在同一房间。

用户信息:
${JSON.stringify(userTags, null, 2)}

可用房间:
${JSON.stringify(availableRooms, null, 2)}

房间容量: ${roomCapacity}人/间

请分析每个用户的标签，按照以下规则进行分配:
1. 相似或互补性格的用户应该分配在一起（例如：#内向 的用户可能会和 #安静 的用户相处融洽）
2. 避免将可能冲突的性格放在一起（例如：#夜猫子 和 #早起族）
3. 均衡分配，使每个房间的人数尽量接近
4. 确保不超过房间容量

请以JSON格式返回分配结果，格式为 {"房间ID": [用户ID数组]}。例如:
{
  "1": [101, 102],
  "2": [103, 104, 105]
}
只返回JSON，不要有其他解释。
`;

        // 发送请求到DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-d73222281bff4d9e88795be48390d903'
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 2000
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`DeepSeek API错误: ${data.error?.message || '未知错误'}`);
        }

        // 解析返回的内容
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('AI没有返回有效内容');
        }

        // 提取JSON内容
        const jsonMatch = content.match(/({[\s\S]*})/);
        if (!jsonMatch) {
            throw new Error('无法从AI响应中提取JSON');
        }

        const roomAssignments = JSON.parse(jsonMatch[1]);

        // 验证分配结果
        for (const roomId in roomAssignments) {
            const usersInRoom = roomAssignments[roomId];
            const room = rooms.find(r => r.room_id === Number(roomId));

            if (!room) {
                throw new Error(`无效的房间ID: ${roomId}`);
            }

            if (usersInRoom.length > (room.capacity - room.current_occupants)) {
                throw new Error(`房间 ${room.room_number} 分配超过容量`);
            }
        }

        return roomAssignments;
    } catch (error) {
        console.error('AI分配舍友错误:', error);

        // 如果AI分配失败，使用简单算法均匀分配
        return fallbackRoommateAssignment(applicants, rooms, roomCapacity);
    }
}

// 备用的舍友分配算法
function fallbackRoommateAssignment(applicants, rooms, roomCapacity) {
    const assignments = {};
    let applicantIndex = 0;

    // 遍历所有房间
    for (const room of rooms) {
        const availableSpots = room.capacity - room.current_occupants;
        if (availableSpots <= 0) continue;

        const usersForRoom = [];

        // 分配用户到这个房间，直到满或者没有更多申请者
        for (let i = 0; i < availableSpots && applicantIndex < applicants.length; i++) {
            usersForRoom.push(applicants[applicantIndex].userId);
            applicantIndex++;
        }

        if (usersForRoom.length > 0) {
            assignments[room.room_id] = usersForRoom;
        }

        // 如果所有申请者都已分配，退出循环
        if (applicantIndex >= applicants.length) break;
    }

    return assignments;
}

// 获取宿舍房间信息
router.get('/rooms', async (req, res) => {
    try {
        const { dormId } = req.query;

        if (!dormId) {
            return res.status(400).json({
                success: false,
                message: '请提供宿舍ID'
            });
        }

        // 查询房间信息
        const [rooms] = await db.execute(
            `SELECT 
                room_id,
                dorm_id,
                room_number,
                capacity,
                current_occupants
             FROM Rooms
             WHERE dorm_id = ?
             ORDER BY room_number ASC`,
            [dormId]
        );

        res.status(200).json({
            success: true,
            rooms: rooms
        });
    } catch (error) {
        console.error('获取房间信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});

// 获取房间居住情况
router.get('/room-occupants', async (req, res) => {
    try {
        const { dormId, roomId } = req.query;

        if (!dormId) {
            return res.status(400).json({
                success: false,
                message: '请提供宿舍ID'
            });
        }

        let query = `
            SELECT 
                o.user_id,
                u.username,
                u.user_tags,
                r.room_number,
                r.room_id
            FROM DormOccupants o
            JOIN Users u ON o.user_id = u.user_id
            JOIN Rooms r ON o.room_id = r.room_id
            WHERE o.dorm_id = ?
        `;

        const params = [dormId];

        if (roomId) {
            query += ' AND o.room_id = ?';
            params.push(roomId);
        }

        query += ' ORDER BY r.room_number ASC, u.username ASC';

        const [occupants] = await db.execute(query, params);

        // 按房间分组
        const roomOccupants = {};

        for (const occupant of occupants) {
            const key = occupant.room_id;

            if (!roomOccupants[key]) {
                roomOccupants[key] = {
                    room_id: occupant.room_id,
                    room_number: occupant.room_number,
                    occupants: []
                };
            }

            roomOccupants[key].occupants.push({
                user_id: occupant.user_id,
                username: occupant.username,
                user_tags: occupant.user_tags
            });
        }

        res.status(200).json({
            success: true,
            roomOccupants: Object.values(roomOccupants)
        });
    } catch (error) {
        console.error('获取房间居住情况错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});

module.exports = router;