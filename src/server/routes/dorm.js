const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { generateDormHash } = require('../utils/dorm');
const { authenticateToken } = require('../middleware/auth');

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
                rooms_per_floor,
                creator_user_id
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
            // 1. 先删除与该宿舍关联的申请记录
            await connection.execute(
                'DELETE FROM DormApplication WHERE dorm_id = ?',
                [dormId]
            );

            // 2. 删除与该宿舍关联的床位分配记录
            await connection.execute(
                'DELETE FROM DormOccupants WHERE room_id IN (SELECT room_id FROM Rooms WHERE dorm_id = ?)',
                [dormId]
            );

            // 3. 删除与该宿舍关联的房间记录
            await connection.execute(
                'DELETE FROM Rooms WHERE dorm_id = ?',
                [dormId]
            );

            // 4. 最后删除宿舍
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

        // 检查是否已经加入了其他宿舍
        const [existingOccupancy] = await db.execute(
            'SELECT * FROM DormOccupants WHERE user_id = ?',
            [userId]
        );

        if (existingOccupancy.length > 0) {
            return res.status(400).json({
                success: false,
                message: '您已经加入了一个宿舍，不能同时加入多个宿舍'
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

        // 如果要批准申请，先检查用户是否已加入其他宿舍
        if (status === 'approved') {
            const [existingOccupancy] = await db.execute(
                'SELECT * FROM DormOccupants WHERE user_id = ?',
                [application.user_id]
            );

            if (existingOccupancy.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '该用户已经加入了一个宿舍，不能同时加入多个宿舍'
                });
            }
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

        // 检查所有申请用户是否已加入其他宿舍
        const userIds = applications.map(app => app.user_id);
        const [existingOccupancies] = await db.execute(
            'SELECT user_id FROM DormOccupants WHERE user_id IN (?) AND dorm_id = ?',
            [userIds, dormId]
        );

        if (existingOccupancies.length > 0) {
            const occupiedUserIds = existingOccupancies.map(record => record.user_id);
            return res.status(400).json({
                success: false,
                message: '部分用户已加入该宿舍，无法重复分配',
                data: {
                    occupiedUserIds
                }
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
            const validRoomAssignments = {};
            let assignedUserCount = 0;

            for (const roomId in roomAssignments) {
                const usersInRoom = roomAssignments[roomId];
                const room = rooms.find(r => r.room_id === Number(roomId));

                if (!room) {
                    console.warn(`无效的房间ID: ${roomId}，跳过处理`);
                    continue;
                }

                // 验证所有分配的用户ID都在申请列表中
                const validUserIds = [];
                for (const userId of usersInRoom) {
                    // 检查用户ID是否在申请列表中
                    const isValidUser = applications.some(app => app.user_id === Number(userId));

                    if (isValidUser) {
                        validUserIds.push(userId);
                    } else {
                        console.log(`跳过无效的用户ID: ${userId}，该用户不在申请列表中`);
                    }
                }

                // 检查房间容量
                if (validUserIds.length > (room.capacity - room.current_occupants)) {
                    console.warn(`房间 ${room.room_number} 分配超过容量，调整分配数量`);
                    // 截取到可用容量
                    validUserIds.splice(room.capacity - room.current_occupants);
                }

                // 只处理有效的用户ID
                if (validUserIds.length > 0) {
                    validRoomAssignments[roomId] = validUserIds;
                    assignedUserCount += validUserIds.length;

                    // 更新DormOccupants表
                    for (const userId of validUserIds) {
                        // 检查是否已存在该记录，避免重复插入
                        const [existingRecord] = await connection.execute(
                            'SELECT * FROM DormOccupants WHERE dorm_id = ? AND user_id = ?',
                            [dormId, userId]
                        );

                        // 只有在记录不存在的情况下才插入
                        if (existingRecord.length === 0) {
                            // 插入新的记录
                            await connection.execute(
                                'INSERT INTO DormOccupants (dorm_id, user_id, room_id) VALUES (?, ?, ?)',
                                [dormId, userId, roomId]
                            );
                        } else {
                            console.log(`用户 ${userId} 已在宿舍 ${dormId} 中，跳过插入`);
                        }

                        // 更新申请状态为approved
                        await connection.execute(
                            'UPDATE DormApplication SET application_status = "approved" WHERE dorm_id = ? AND user_id = ?',
                            [dormId, userId]
                        );
                    }

                    // 更新房间当前入住人数
                    await connection.execute(
                        'UPDATE Rooms SET current_occupants = current_occupants + ? WHERE room_id = ?',
                        [validUserIds.length, roomId]
                    );
                }
            }

            // 验证是否所有申请者都已分配
            if (assignedUserCount !== applications.length) {
                console.warn(`警告: 只有 ${assignedUserCount}/${applications.length} 名申请者被分配`);
            }

            // 检查是否有未分配的用户，将他们分配到有空间的房间
            if (assignedUserCount < applicants.length) {
                const unassignedUsers = applicants.filter(app => !validRoomAssignments.some(r => r.includes(app.userId)));
                console.warn(`有 ${unassignedUsers.length} 个用户未被AI分配，尝试手动分配`);

                // 计算每个房间当前的分配情况
                const roomOccupancy = {};
                for (const roomId in validRoomAssignments) {
                    const room = rooms.find(r => r.room_id === Number(roomId));
                    if (room) {
                        roomOccupancy[roomId] = {
                            room,
                            currentUsers: validRoomAssignments[roomId].length,
                            capacity: room.capacity - room.current_occupants
                        };
                    }
                }

                // 将未分配的房间也添加到占用情况
                for (const room of rooms) {
                    const roomId = room.room_id.toString();
                    if (!roomOccupancy[roomId]) {
                        roomOccupancy[roomId] = {
                            room,
                            currentUsers: 0,
                            capacity: room.capacity - room.current_occupants
                        };
                    }
                }

                // 按优先级排序房间：
                // 1. 优先填满那些已经有人但未满的房间
                // 2. 避免创建单人住房（除非是最后一个房间）
                const prioritizedRooms = Object.keys(roomOccupancy)
                    .filter(roomId => roomOccupancy[roomId].capacity > 0) // 只考虑有空间的房间
                    .sort((a, b) => {
                        const roomA = roomOccupancy[a];
                        const roomB = roomOccupancy[b];

                        // 如果一个房间已经有人但未满，另一个是空房间，优先填满已有人的
                        const aHasPeople = roomA.currentUsers > 0;
                        const bHasPeople = roomB.currentUsers > 0;

                        if (aHasPeople && !bHasPeople) return -1;
                        if (!aHasPeople && bHasPeople) return 1;

                        // 如果两个房间都已有人或都是空的，选择接近满的
                        // 优先填满占用比例更高的房间
                        const aFillRatio = roomA.currentUsers / roomA.capacity;
                        const bFillRatio = roomB.currentUsers / roomB.capacity;

                        return bFillRatio - aFillRatio; // 降序排列，填满比例高的排前面
                    });

                // 再次尝试分配用户
                let userIndex = 0;
                for (const roomId of prioritizedRooms) {
                    if (userIndex >= unassignedUsers.length) break;

                    const roomInfo = roomOccupancy[roomId];
                    const remainingCapacity = roomInfo.capacity - roomInfo.currentUsers;

                    // 决定分配数量
                    let assignCount = Math.min(remainingCapacity, unassignedUsers.length - userIndex);

                    // 避免单人住的情况（除非是最后一个房间或已经有人）
                    const isLastRoom = roomId === prioritizedRooms[prioritizedRooms.length - 1];
                    const alreadyHasPeople = roomInfo.currentUsers > 0;
                    const wouldCreateSingleOccupancy = (roomInfo.currentUsers + assignCount === 1);

                    if (wouldCreateSingleOccupancy && !isLastRoom && !alreadyHasPeople) {
                        // 跳过该房间，避免创建单人住房
                        continue;
                    }

                    // 分配用户到当前房间
                    if (assignCount > 0) {
                        if (!validRoomAssignments[roomId]) {
                            validRoomAssignments[roomId] = [];
                        }

                        for (let i = 0; i < assignCount; i++) {
                            if (userIndex < unassignedUsers.length) {
                                const userId = unassignedUsers[userIndex].userId.toString();
                                validRoomAssignments[roomId].push(userId);
                                assignedUserCount++;
                                console.log(`手动将用户 ${userId} 分配到房间 ${roomId}`);
                                userIndex++;
                            }
                        }

                        // 更新房间占用情况
                        roomOccupancy[roomId].currentUsers += assignCount;
                    }
                }

                // 如果还有未分配的用户（极端情况），将它们放入任何有空间的房间
                if (userIndex < unassignedUsers.length) {
                    console.warn(`仍有 ${unassignedUsers.length - userIndex} 个用户未分配，进行最后一轮分配`);

                    for (const room of rooms) {
                        const roomId = room.room_id.toString();
                        const currentlyAssigned = validRoomAssignments[roomId]?.length || 0;
                        const availableSpots = room.capacity - room.current_occupants - currentlyAssigned;

                        if (availableSpots > 0) {
                            if (!validRoomAssignments[roomId]) {
                                validRoomAssignments[roomId] = [];
                            }

                            for (let i = 0; i < availableSpots && userIndex < unassignedUsers.length; i++) {
                                const userId = unassignedUsers[userIndex].userId.toString();
                                validRoomAssignments[roomId].push(userId);
                                assignedUserCount++;
                                console.log(`最终将用户 ${userId} 分配到房间 ${roomId}`);
                                userIndex++;
                            }
                        }

                        if (userIndex >= unassignedUsers.length) break;
                    }
                }

                // 如果仍有未分配的用户，记录警告
                if (userIndex < unassignedUsers.length) {
                    console.warn(`警告: 仍有 ${unassignedUsers.length - userIndex} 个用户未能分配，可能是房间空间不足`);
                }
            }

            // 提交事务
            await connection.commit();

            // 处理返回结果
            res.status(200).json({
                success: true,
                message: '舍友分配成功',
                data: {
                    roomAssignments: validRoomAssignments
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

// 调用DeepSeek API进行舍友匹配
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
3. 优先填满房间再开始使用新房间，严格避免出现单人住一间房的情况
4. 只有在最后一个分配的房间才允许有空位，其他房间都应该尽量填满
5. 确保不超过房间容量
6. 每个用户只能分配到一个房间，不允许重复分配
7. 优先使用已经有人入住的房间，再使用空房间

按照以下策略分配：
- 如果有多个空房间，尽量集中使用少数几个房间，避免用户分散在多个房间
- 把相似或互补性格的用户分配到同一房间，形成和谐的居住环境
- 如果可用空间有限，先填满已经有人的房间，然后再考虑新开空房间
- 非常重要：避免出现单人住一间房的情况，除非是最后分配的房间且没有更好的选择

请以JSON格式返回分配结果，格式为 {"房间ID": [用户ID数组]}。例如:
{
  "1": [101, 102, 103, 104],
  "2": [105, 106, 107, 108],
  "3": [109, 110]
}
只返回JSON，不要有其他解释。
确保每个用户ID仅在一个房间中出现一次。
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

        // 验证分配结果，确保每个用户只被分配到一个房间
        const validRoomAssignments = {};
        let assignedUserCount = 0;
        const assignedUsers = new Set(); // 跟踪已分配的用户

        for (const roomId in roomAssignments) {
            const usersInRoom = roomAssignments[roomId];
            const room = rooms.find(r => r.room_id === Number(roomId));

            if (!room) {
                console.warn(`无效的房间ID: ${roomId}`);
                continue;
            }

            // 过滤出有效的用户ID（在applicants中存在的且未被分配过的）
            const validUsers = [];
            for (const userId of usersInRoom) {
                const userIdNum = Number(userId);
                const isValid = applicants.some(app => app.userId === userIdNum) && !assignedUsers.has(userIdNum);

                if (isValid) {
                    validUsers.push(userId);
                    assignedUsers.add(userIdNum); // 标记该用户已被分配
                } else if (assignedUsers.has(userIdNum)) {
                    console.warn(`用户 ${userId} 已被分配到其他房间，跳过重复分配`);
                } else {
                    console.warn(`无效的用户ID: ${userId}，跳过`);
                }
            }

            if (validUsers.length > (room.capacity - room.current_occupants)) {
                console.warn(`房间 ${room.room_number} 分配超过容量，调整分配数量`);
                validUsers.splice(room.capacity - room.current_occupants);
            }

            // 只有有效用户才添加到结果中
            if (validUsers.length > 0) {
                validRoomAssignments[roomId] = validUsers;
                assignedUserCount += validUsers.length;
            }
        }

        // 检查是否有未分配的用户，将他们分配到有空间的房间
        if (assignedUserCount < applicants.length) {
            const unassignedUsers = applicants.filter(app => !assignedUsers.has(app.userId));
            console.warn(`有 ${unassignedUsers.length} 个用户未被AI分配，尝试手动分配`);

            // 计算每个房间当前的分配情况
            const roomOccupancy = {};
            for (const roomId in validRoomAssignments) {
                const room = rooms.find(r => r.room_id === Number(roomId));
                if (room) {
                    roomOccupancy[roomId] = {
                        room,
                        currentUsers: validRoomAssignments[roomId].length,
                        capacity: room.capacity - room.current_occupants
                    };
                }
            }

            // 将未分配的房间也添加到占用情况
            for (const room of rooms) {
                const roomId = room.room_id.toString();
                if (!roomOccupancy[roomId]) {
                    roomOccupancy[roomId] = {
                        room,
                        currentUsers: 0,
                        capacity: room.capacity - room.current_occupants
                    };
                }
            }

            // 按优先级排序房间：
            // 1. 优先填满那些已经有人但未满的房间
            // 2. 避免创建单人住房（除非是最后一个房间）
            const prioritizedRooms = Object.keys(roomOccupancy)
                .filter(roomId => roomOccupancy[roomId].capacity > 0) // 只考虑有空间的房间
                .sort((a, b) => {
                    const roomA = roomOccupancy[a];
                    const roomB = roomOccupancy[b];

                    // 如果一个房间已经有人但未满，另一个是空房间，优先填满已有人的
                    const aHasPeople = roomA.currentUsers > 0;
                    const bHasPeople = roomB.currentUsers > 0;

                    if (aHasPeople && !bHasPeople) return -1;
                    if (!aHasPeople && bHasPeople) return 1;

                    // 如果两个房间都已有人或都是空的，选择接近满的
                    // 优先填满占用比例更高的房间
                    const aFillRatio = roomA.currentUsers / roomA.capacity;
                    const bFillRatio = roomB.currentUsers / roomB.capacity;

                    return bFillRatio - aFillRatio; // 降序排列，填满比例高的排前面
                });

            // 再次尝试分配用户
            let userIndex = 0;
            for (const roomId of prioritizedRooms) {
                if (userIndex >= unassignedUsers.length) break;

                const roomInfo = roomOccupancy[roomId];
                const remainingCapacity = roomInfo.capacity - roomInfo.currentUsers;

                // 决定分配数量
                let assignCount = Math.min(remainingCapacity, unassignedUsers.length - userIndex);

                // 避免单人住的情况（除非是最后一个房间或已经有人）
                const isLastRoom = roomId === prioritizedRooms[prioritizedRooms.length - 1];
                const alreadyHasPeople = roomInfo.currentUsers > 0;
                const wouldCreateSingleOccupancy = (roomInfo.currentUsers + assignCount === 1);

                if (wouldCreateSingleOccupancy && !isLastRoom && !alreadyHasPeople) {
                    // 跳过该房间，避免创建单人住房
                    continue;
                }

                // 分配用户到当前房间
                if (assignCount > 0) {
                    if (!validRoomAssignments[roomId]) {
                        validRoomAssignments[roomId] = [];
                    }

                    for (let i = 0; i < assignCount; i++) {
                        if (userIndex < unassignedUsers.length) {
                            const userId = unassignedUsers[userIndex].userId.toString();
                            validRoomAssignments[roomId].push(userId);
                            assignedUserCount++;
                            console.log(`手动将用户 ${userId} 分配到房间 ${roomId}`);
                            userIndex++;
                        }
                    }

                    // 更新房间占用情况
                    roomOccupancy[roomId].currentUsers += assignCount;
                }
            }

            // 如果还有未分配的用户（极端情况），将它们放入任何有空间的房间
            if (userIndex < unassignedUsers.length) {
                console.warn(`仍有 ${unassignedUsers.length - userIndex} 个用户未分配，进行最后一轮分配`);

                for (const room of rooms) {
                    const roomId = room.room_id.toString();
                    const currentlyAssigned = validRoomAssignments[roomId]?.length || 0;
                    const availableSpots = room.capacity - room.current_occupants - currentlyAssigned;

                    if (availableSpots > 0) {
                        if (!validRoomAssignments[roomId]) {
                            validRoomAssignments[roomId] = [];
                        }

                        for (let i = 0; i < availableSpots && userIndex < unassignedUsers.length; i++) {
                            const userId = unassignedUsers[userIndex].userId.toString();
                            validRoomAssignments[roomId].push(userId);
                            assignedUserCount++;
                            console.log(`最终将用户 ${userId} 分配到房间 ${roomId}`);
                            userIndex++;
                        }
                    }

                    if (userIndex >= unassignedUsers.length) break;
                }
            }

            // 如果仍有未分配的用户，记录警告
            if (userIndex < unassignedUsers.length) {
                console.warn(`警告: 仍有 ${unassignedUsers.length - userIndex} 个用户未能分配，可能是房间空间不足`);
            }
        }

        return validRoomAssignments;
    } catch (error) {
        console.error('AI分配舍友错误:', error);

        // 如果AI分配失败，使用简单算法均匀分配
        return fallbackRoommateAssignment(applicants, rooms, roomCapacity);
    }
}

// 更新后的备用舍友分配算法，优先填满房间
function fallbackRoommateAssignment(applicants, rooms, roomCapacity) {
    // 首先对房间进行排序，确保先使用当前入住人数更多的房间
    const sortedRooms = [...rooms].sort((a, b) => {
        // 首先按照已有入住人数降序排列（优先填满已有人的房间）
        const occupancyDiff = b.current_occupants - a.current_occupants;
        if (occupancyDiff !== 0) return occupancyDiff;

        // 如果当前入住人数相同，优先选择已有人的房间
        if (a.current_occupants > 0 && b.current_occupants === 0) return -1;
        if (a.current_occupants === 0 && b.current_occupants > 0) return 1;

        // 如果入住人数相同，按房间编号排序
        return a.room_number - b.room_number;
    });

    const assignments = {};
    const assignedUsers = new Set(); // 跟踪已分配的用户
    let remainingApplicants = [...applicants];

    // 计算总可用床位
    const totalAvailableSpots = sortedRooms.reduce((total, room) =>
        total + (room.capacity - room.current_occupants), 0);

    // 如果申请人数超过可用床位，记录警告
    if (applicants.length > totalAvailableSpots) {
        console.warn(`警告: 申请人数(${applicants.length})超过可用床位数(${totalAvailableSpots})`);
    }

    // 第一轮：填满已经有人的房间
    for (const room of sortedRooms) {
        if (room.current_occupants > 0 && room.current_occupants < room.capacity) {
            const availableSpots = room.capacity - room.current_occupants;
            const usersForRoom = [];

            // 尝试将剩余申请者分配到这个房间，直到满
            const roomApplicants = remainingApplicants.splice(0, availableSpots);

            for (const applicant of roomApplicants) {
                if (!assignedUsers.has(applicant.userId)) {
                    usersForRoom.push(applicant.userId.toString()); // 确保ID是字符串
                    assignedUsers.add(applicant.userId);
                }
            }

            if (usersForRoom.length > 0) {
                assignments[room.room_id] = usersForRoom;
            }

            // 更新剩余申请者列表，移除已分配的用户
            remainingApplicants = remainingApplicants.filter(app => !assignedUsers.has(app.userId));
        }
    }

    // 没有更多申请者，返回结果
    if (remainingApplicants.length === 0) {
        return assignments;
    }

    // 第二轮：为剩余申请者尽量填满空房间
    // 计算最优房间分配策略
    const emptyRooms = sortedRooms.filter(r => r.current_occupants === 0);

    // 如果空房间数量 * 房间容量 < 剩余申请者数量，我们需要尽量填满所有房间
    // 否则，我们需要避免单人住宿的情况
    const shouldFillAllRooms = (emptyRooms.length * roomCapacity < remainingApplicants.length);

    // 重新计算房间分配序列，优先考虑生成更好的住宿体验
    // 1. 如果申请者很多，尽量均匀分配
    // 2. 如果申请者较少，避免单人住宿
    const optimizedRoomOrder = [...emptyRooms];

    if (!shouldFillAllRooms) {
        // 如果不需要填满所有房间，我们将剩余申请者分组，避免单人住宿
        const totalRemainingApplicants = remainingApplicants.length;
        const optimalRoomCount = Math.ceil(totalRemainingApplicants / 2); // 假设至少2人一间

        // 限制使用的房间数量，避免单人分散
        optimizedRoomOrder.splice(optimalRoomCount);
    }

    // 现在开始分配
    for (let i = 0; i < optimizedRoomOrder.length && remainingApplicants.length > 0; i++) {
        const room = optimizedRoomOrder[i];
        const isLastRoom = i === optimizedRoomOrder.length - 1 || remainingApplicants.length <= room.capacity;
        const usersForRoom = [];

        // 决定分配数量
        let allocCount = Math.min(room.capacity, remainingApplicants.length);

        // 如果不是最后一个房间，且分配后会导致单人住宿，则调整分配数量
        if (!isLastRoom && allocCount === 1) {
            continue; // 跳过这个房间，让剩余的申请者合并到后面的房间
        }

        // 分配申请者到当前房间
        const roomApplicants = remainingApplicants.splice(0, allocCount);

        for (const applicant of roomApplicants) {
            if (!assignedUsers.has(applicant.userId)) {
                usersForRoom.push(applicant.userId.toString()); // 确保ID是字符串
                assignedUsers.add(applicant.userId);
            }
        }

        if (usersForRoom.length > 0) {
            assignments[room.room_id] = usersForRoom;
        }

        // 更新剩余申请者列表
        remainingApplicants = remainingApplicants.filter(app => !assignedUsers.has(app.userId));
    }

    // 最后检查是否还有未分配的申请者
    if (remainingApplicants.length > 0) {
        console.log(`仍有 ${remainingApplicants.length} 名申请者未分配，尝试最后分配`);

        // 寻找任何还有空间的房间
        for (const room of sortedRooms) {
            if (remainingApplicants.length === 0) break;

            // 检查该房间是否已经在assignments中
            const currentlyAssigned = assignments[room.room_id] ? assignments[room.room_id].length : 0;
            const availableSpots = room.capacity - room.current_occupants - currentlyAssigned;

            if (availableSpots > 0) {
                const usersToAdd = [];
                const roomApplicants = remainingApplicants.splice(0, availableSpots);

                for (const applicant of roomApplicants) {
                    if (!assignedUsers.has(applicant.userId)) {
                        usersToAdd.push(applicant.userId.toString()); // 确保ID是字符串
                        assignedUsers.add(applicant.userId);
                    }
                }

                if (usersToAdd.length > 0) {
                    if (!assignments[room.room_id]) {
                        assignments[room.room_id] = [];
                    }
                    assignments[room.room_id] = [...assignments[room.room_id], ...usersToAdd];
                }

                // 更新剩余申请者列表
                remainingApplicants = remainingApplicants.filter(app => !assignedUsers.has(app.userId));
            }
        }
    }

    // 如果还有未分配的申请者，记录警告
    if (remainingApplicants.length > 0) {
        console.warn(`警告: 有 ${remainingApplicants.length} 名申请者未能分配到房间`);
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

// 转移用户到新床位（新位置是空床位）
router.post('/reassign-bed', authenticateToken, async (req, res) => {
    try {
        const { userId, roomId, newRoomId } = req.body;

        // 验证参数
        if (!userId || !roomId || !newRoomId) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        // 开始事务
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 获取宿舍ID
            const [roomResult] = await connection.execute(
                'SELECT dorm_id FROM Rooms WHERE room_id = ?',
                [roomId]
            );

            if (roomResult.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: '房间不存在'
                });
            }

            const dormId = roomResult[0].dorm_id;

            // 验证新房间是否存在且属于同一宿舍
            const [newRoomResult] = await connection.execute(
                'SELECT dorm_id, current_occupants, capacity FROM Rooms WHERE room_id = ?',
                [newRoomId]
            );

            if (newRoomResult.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: '目标房间不存在'
                });
            }

            if (newRoomResult[0].dorm_id !== dormId) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: '不能跨宿舍调整床位'
                });
            }

            if (newRoomResult[0].current_occupants >= newRoomResult[0].capacity) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: '目标房间已满'
                });
            }

            // 更新用户的房间分配
            await connection.execute(
                'UPDATE DormOccupants SET room_id = ? WHERE user_id = ? AND dorm_id = ?',
                [newRoomId, userId, dormId]
            );

            // 更新原房间和新房间的入住人数
            await connection.execute(
                'UPDATE Rooms SET current_occupants = current_occupants - 1 WHERE room_id = ?',
                [roomId]
            );

            await connection.execute(
                'UPDATE Rooms SET current_occupants = current_occupants + 1 WHERE room_id = ?',
                [newRoomId]
            );

            // 提交事务
            await connection.commit();

            res.json({
                success: true,
                message: '床位调整成功'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('床位调整错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 交换两个用户的床位
router.post('/swap-beds', authenticateToken, async (req, res) => {
    try {
        const { userId1, roomId1, userId2, roomId2 } = req.body;

        // 验证参数
        if (!userId1 || !roomId1 || !userId2 || !roomId2) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        // 验证是否在同一房间 - 不允许同一房间交换床位
        if (roomId1 === roomId2) {
            return res.status(400).json({
                success: false,
                message: '同一房间内不允许交换床位'
            });
        }

        // 开始事务
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 获取宿舍ID
            const [roomResult] = await connection.execute(
                'SELECT dorm_id FROM Rooms WHERE room_id = ?',
                [roomId1]
            );

            if (roomResult.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: '房间不存在'
                });
            }

            const dormId = roomResult[0].dorm_id;

            // 验证第二个房间是否存在且属于同一宿舍
            const [room2Result] = await connection.execute(
                'SELECT dorm_id FROM Rooms WHERE room_id = ?',
                [roomId2]
            );

            if (room2Result.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: '目标房间不存在'
                });
            }

            if (room2Result[0].dorm_id !== dormId) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: '不能跨宿舍交换床位'
                });
            }

            // 验证两个用户是否都在宿舍中
            const [user1Result] = await connection.execute(
                'SELECT * FROM DormOccupants WHERE user_id = ? AND dorm_id = ? AND room_id = ?',
                [userId1, dormId, roomId1]
            );

            const [user2Result] = await connection.execute(
                'SELECT * FROM DormOccupants WHERE user_id = ? AND dorm_id = ? AND room_id = ?',
                [userId2, dormId, roomId2]
            );

            if (user1Result.length === 0 || user2Result.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: '用户床位信息不匹配'
                });
            }

            // 交换两个用户的房间分配
            await connection.execute(
                'UPDATE DormOccupants SET room_id = ? WHERE user_id = ? AND dorm_id = ?',
                [roomId2, userId1, dormId]
            );

            await connection.execute(
                'UPDATE DormOccupants SET room_id = ? WHERE user_id = ? AND dorm_id = ?',
                [roomId1, userId2, dormId]
            );

            // 提交事务
            await connection.commit();

            res.json({
                success: true,
                message: '床位交换成功'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('床位交换错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 移除用户住户
router.post('/remove-occupant', authenticateToken, async (req, res) => {
    try {
        const { userId, roomId } = req.body;

        // 验证参数
        if (!userId || !roomId) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        // 开始事务
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 获取宿舍ID和房间信息
            const [roomResult] = await connection.execute(
                'SELECT dorm_id FROM Rooms WHERE room_id = ?',
                [roomId]
            );

            if (roomResult.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: '房间不存在'
                });
            }

            const dormId = roomResult[0].dorm_id;

            // 验证用户是否在该房间
            const [userOccupancy] = await connection.execute(
                'SELECT * FROM DormOccupants WHERE user_id = ? AND room_id = ? AND dorm_id = ?',
                [userId, roomId, dormId]
            );

            if (userOccupancy.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: '该用户不在此房间'
                });
            }

            // 从DormOccupants表中删除记录
            await connection.execute(
                'DELETE FROM DormOccupants WHERE user_id = ? AND room_id = ? AND dorm_id = ?',
                [userId, roomId, dormId]
            );

            // 更新房间的入住人数
            await connection.execute(
                'UPDATE Rooms SET current_occupants = current_occupants - 1 WHERE room_id = ?',
                [roomId]
            );

            // 更新用户表中的宿舍ID
            await connection.execute(
                'UPDATE Users SET dorm_id = NULL WHERE user_id = ?',
                [userId]
            );

            // 提交事务
            await connection.commit();

            res.json({
                success: true,
                message: '已成功移除住户'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('移除住户错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;