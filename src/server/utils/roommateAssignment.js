/**
 * 三层智能舍友分配系统
 *
 * Layer 1 (算法): 硬约束处理 — 睡眠时间分组 + 午睡习惯 + 填满优化
 * Layer 2 (AI):   性格兼容性推理 — OCEAN 向量分析，组内最优配对
 * Layer 3 (AI):   兼容性报告生成 — 为每个房间输出分析报告
 */

const fetch = require('node-fetch');
const { vectorToOCEAN } = require('./personalityProfile');

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-d73222281bff4d9e88795be48390d903';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// ════════════════════════════════════════════════
//  工具函数
// ════════════════════════════════════════════════

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function circularTimeDiff(a, b) {
    if (a === null || b === null) return Infinity;
    const diff = Math.abs(a - b);
    return Math.min(diff, 1440 - diff);
}

function getOCEANLabel(ocean) {
    const labels = { O: '开放性', C: '责任心', E: '外向性', A: '宜人性', N: '情绪敏感度' };
    return Object.entries(ocean).map(([k, v]) => `${labels[k]}=${Math.round(v)}`).join(', ');
}

async function callDeepSeek(prompt, temperature = 0.3) {
    const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: 4000
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`DeepSeek API: ${data.error?.message || '未知错误'}`);
    return data.choices?.[0]?.message?.content || '';
}

// ════════════════════════════════════════════════
//  LAYER 1: 硬约束分组 (纯算法)
// ════════════════════════════════════════════════

function layer1_groupByConstraints(applicants) {
    const SLEEP_THRESHOLD = 60; // 60分钟 = 1小时

    const withSleep = [];
    const noSleep = [];

    for (const a of applicants) {
        const startMin = parseTimeToMinutes(a.sleep_time_start);
        const endMin = parseTimeToMinutes(a.sleep_time_end);
        if (startMin !== null && endMin !== null) {
            withSleep.push({ ...a, _sleepStart: startMin, _sleepEnd: endMin });
        } else {
            noSleep.push(a);
        }
    }

    // 按入睡时间排序（处理跨午夜：22:00~02:00 映射为 1320~1560）
    withSleep.sort((a, b) => {
        const sa = a._sleepStart < 360 ? a._sleepStart + 1440 : a._sleepStart;
        const sb = b._sleepStart < 360 ? b._sleepStart + 1440 : b._sleepStart;
        return sa - sb;
    });

    // 贪心聚类：相邻用户睡眠时间差 ≤ 阈值则归入同组
    const sleepGroups = [];
    let currentGroup = [];

    for (const user of withSleep) {
        if (currentGroup.length === 0) {
            currentGroup.push(user);
        } else {
            const lastUser = currentGroup[currentGroup.length - 1];
            const startDiff = circularTimeDiff(lastUser._sleepStart, user._sleepStart);
            const endDiff = circularTimeDiff(lastUser._sleepEnd, user._sleepEnd);

            if (startDiff <= SLEEP_THRESHOLD && endDiff <= SLEEP_THRESHOLD) {
                currentGroup.push(user);
            } else {
                sleepGroups.push(currentGroup);
                currentGroup = [user];
            }
        }
    }
    if (currentGroup.length > 0) sleepGroups.push(currentGroup);

    // 组内按午睡习惯子排序：午睡的排在一起
    for (const group of sleepGroups) {
        group.sort((a, b) => {
            if (a.has_nap === b.has_nap) {
                if (!a.has_nap) return 0;
                const aNapStart = parseTimeToMinutes(a.nap_time_start) || 0;
                const bNapStart = parseTimeToMinutes(b.nap_time_start) || 0;
                return Math.abs(aNapStart - bNapStart);
            }
            return a.has_nap ? -1 : 1;
        });
    }

    return { sleepGroups, flexibleUsers: noSleep };
}

function layer1_assignToRooms(sleepGroups, flexibleUsers, rooms, roomCapacity) {
    // 按已入住人数降序排列（优先填满已有人的房间）
    const sortedRooms = [...rooms].sort((a, b) => {
        if (b.current_occupants !== a.current_occupants) return b.current_occupants - a.current_occupants;
        return a.room_number.localeCompare(b.room_number);
    });

    const preAssignment = {}; // roomId -> [user objects]
    const roomRemaining = {};
    for (const r of sortedRooms) {
        roomRemaining[r.room_id] = r.capacity - r.current_occupants;
    }

    const assignedUserIds = new Set();

    function getAvailableRoom(preferFill) {
        if (preferFill) {
            const partial = sortedRooms.find(r =>
                roomRemaining[r.room_id] > 0 && r.current_occupants > 0
            );
            if (partial) return partial;
        }
        // 优先找已分配了人但没满的房间
        const partiallyAssigned = sortedRooms.find(r =>
            roomRemaining[r.room_id] > 0 && preAssignment[r.room_id]?.length > 0
        );
        if (partiallyAssigned) return partiallyAssigned;
        return sortedRooms.find(r => roomRemaining[r.room_id] > 0);
    }

    function assignUsers(users) {
        let remaining = users.filter(u => !assignedUserIds.has(u.userId));

        while (remaining.length > 0) {
            const room = getAvailableRoom(true);
            if (!room) break;

            const spots = roomRemaining[room.room_id];
            const batch = remaining.splice(0, spots);

            if (!preAssignment[room.room_id]) preAssignment[room.room_id] = [];
            for (const u of batch) {
                preAssignment[room.room_id].push(u);
                assignedUserIds.add(u.userId);
                roomRemaining[room.room_id]--;
            }
        }
        return remaining;
    }

    // 按组大小降序处理（大组先分配，填满房间）
    const sortedGroups = [...sleepGroups].sort((a, b) => b.length - a.length);

    let leftover = [];
    for (const group of sortedGroups) {
        const unassigned = assignUsers(group);
        leftover.push(...unassigned);
    }

    // 分配灵活用户
    leftover.push(...flexibleUsers.filter(u => !assignedUserIds.has(u.userId)));
    assignUsers(leftover);

    // 反单人优化：如果某房间只有1个新分配的人（且DB里也没原住客），尝试合并
    const singleRooms = Object.entries(preAssignment)
        .filter(([rid, users]) => {
            const room = rooms.find(r => r.room_id === Number(rid));
            return users.length === 1 && room && room.current_occupants === 0;
        });

    for (const [singleRoomId, singleUsers] of singleRooms) {
        const targetRoom = sortedRooms.find(r =>
            r.room_id !== Number(singleRoomId) &&
            roomRemaining[r.room_id] > 0 &&
            (preAssignment[r.room_id]?.length > 0 || r.current_occupants > 0)
        );
        if (targetRoom) {
            if (!preAssignment[targetRoom.room_id]) preAssignment[targetRoom.room_id] = [];
            preAssignment[targetRoom.room_id].push(...singleUsers);
            roomRemaining[targetRoom.room_id] -= singleUsers.length;
            delete preAssignment[singleRoomId];
            roomRemaining[Number(singleRoomId)] += singleUsers.length;
        }
    }

    return preAssignment;
}

// ════════════════════════════════════════════════
//  LAYER 2: AI 性格兼容性优化
// ════════════════════════════════════════════════

async function layer2_aiOptimize(preAssignment, applicants, rooms, roomCapacity) {
    // 构建用户OCEAN信息
    const applicantsMap = {};
    for (const a of applicants) {
        applicantsMap[a.userId] = a;
    }

    // 为AI准备数据
    const roomsData = [];
    for (const [roomId, users] of Object.entries(preAssignment)) {
        const room = rooms.find(r => r.room_id === Number(roomId));
        const usersInfo = users.map(u => {
            const info = { user_id: u.userId, username: u.username };
            if (u.vector) {
                const ocean = vectorToOCEAN(u.vector);
                info.OCEAN = {
                    O_开放性: Math.round(ocean.O),
                    C_责任心: Math.round(ocean.C),
                    E_外向性: Math.round(ocean.E),
                    A_宜人性: Math.round(ocean.A),
                    N_情绪敏感度: Math.round(ocean.N)
                };
            }
            if (u.sleep_time_start) info.sleep = `${u.sleep_time_start}~${u.sleep_time_end}`;
            info.has_nap = u.has_nap;
            return info;
        });
        roomsData.push({
            room_id: Number(roomId),
            room_number: room?.room_number || roomId,
            available_spots: room ? room.capacity - room.current_occupants : roomCapacity,
            pre_assigned_users: usersInfo
        });
    }

    // 也列出有空位但未被预分配的房间
    const usedRoomIds = new Set(Object.keys(preAssignment).map(Number));
    const emptyAvailable = rooms
        .filter(r => !usedRoomIds.has(r.room_id) && r.current_occupants < r.capacity)
        .map(r => ({
            room_id: r.room_id,
            room_number: r.room_number,
            available_spots: r.capacity - r.current_occupants,
            pre_assigned_users: []
        }));

    const allRooms = [...roomsData, ...emptyAvailable];

    const prompt = `你是一个智能舍友兼容性分析引擎。

## 任务
第一层算法已按作息时间将用户预分组到各房间。请你在此基础上，根据OCEAN性格向量分析用户间的兼容性，进行优化调整。

## 性格兼容性分析原则
1. **高N(情绪敏感) + 高E(外向) = 冲突风险**：情绪敏感的人对噪音和社交活动干扰很在意，外向活跃的人可能让敏感室友不舒适
2. **高C(自律整洁) + 低C(随意) = 摩擦风险**：整洁自律的人难以忍受不爱收拾的室友
3. **高A(友善) + 高A = 良好组合**：大家都乐于分享沟通，减少矛盾
4. **O(开放性)差异大 = 价值观分歧**：接受新事物的程度差异大可能导致生活方式冲突
5. **高E + 高E 需注意**：都爱社交可能导致互相干扰或频繁带客

## OCEAN值域
0-100，其中 ≤30=低，30-70=中，≥70=高

## 预分组数据（已按作息习惯分组）
${JSON.stringify(allRooms, null, 2)}

## 房间容量: ${roomCapacity}人/间

## 优化规则
1. **同一作息组的用户尽量保持在一起**（作息兼容是最重要的）
2. 在作息兼容的前提下，调整分配使性格兼容性最优
3. 如果预分组已经很好，不需要强行调整
4. 优先填满房间，严格避免单人住一间
5. 每个用户只能出现在一个房间
6. 不能超过房间的available_spots

请以JSON格式返回最终分配结果：{"房间ID": [用户ID数组]}
只返回JSON，不要有任何其他文字。`;

    try {
        console.log('[Layer2] 向AI发送性格兼容性优化请求...');
        const content = await callDeepSeek(prompt, 0.2);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI响应中无有效JSON');

        const aiResult = JSON.parse(jsonMatch[0]);

        // 验证 AI 结果
        const allUserIds = applicants.map(a => a.userId);
        const assignedByAI = new Set();
        const validated = {};

        for (const [roomId, userIds] of Object.entries(aiResult)) {
            const room = rooms.find(r => r.room_id === Number(roomId));
            if (!room) continue;
            const available = room.capacity - room.current_occupants;
            const validUsers = [];
            for (const uid of userIds) {
                const numUid = Number(uid);
                if (allUserIds.includes(numUid) && !assignedByAI.has(numUid)) {
                    validUsers.push(numUid);
                    assignedByAI.add(numUid);
                }
                if (validUsers.length >= available) break;
            }
            if (validUsers.length > 0) validated[roomId] = validUsers.map(String);
        }

        // 处理AI遗漏的用户
        const missed = allUserIds.filter(id => !assignedByAI.has(id));
        if (missed.length > 0) {
            console.log(`[Layer2] AI遗漏 ${missed.length} 个用户，回填处理`);
            for (const uid of missed) {
                const targetRoom = rooms.find(r => {
                    const assigned = validated[r.room_id]?.length || 0;
                    return assigned + r.current_occupants < r.capacity;
                });
                if (targetRoom) {
                    if (!validated[targetRoom.room_id]) validated[targetRoom.room_id] = [];
                    validated[targetRoom.room_id].push(String(uid));
                }
            }
        }

        console.log('[Layer2] AI优化完成');
        return validated;
    } catch (error) {
        console.error('[Layer2] AI优化失败，使用算法预分配结果:', error.message);
        // 回退：直接用预分配结果
        const fallback = {};
        for (const [roomId, users] of Object.entries(preAssignment)) {
            fallback[roomId] = users.map(u => String(u.userId));
        }
        return fallback;
    }
}

// ════════════════════════════════════════════════
//  LAYER 3: AI 兼容性报告生成
// ════════════════════════════════════════════════

async function layer3_generateReports(finalAssignments, applicants, rooms) {
    const applicantsMap = {};
    for (const a of applicants) applicantsMap[a.userId] = a;

    // 只为有2人以上的房间生成报告
    const roomsForReport = [];
    for (const [roomId, userIds] of Object.entries(finalAssignments)) {
        if (userIds.length < 2) continue;
        const room = rooms.find(r => r.room_id === Number(roomId));
        const members = userIds.map(uid => {
            const u = applicantsMap[Number(uid)];
            if (!u) return { user_id: uid, username: '未知' };
            const info = { user_id: uid, username: u.username };
            if (u.vector) {
                const ocean = vectorToOCEAN(u.vector);
                info.OCEAN = {
                    O_开放性: Math.round(ocean.O),
                    C_责任心: Math.round(ocean.C),
                    E_外向性: Math.round(ocean.E),
                    A_宜人性: Math.round(ocean.A),
                    N_情绪敏感度: Math.round(ocean.N)
                };
            }
            if (u.sleep_time_start) info.sleep = `${u.sleep_time_start}~${u.sleep_time_end}`;
            return info;
        });
        roomsForReport.push({
            room_id: roomId,
            room_number: room?.room_number || roomId,
            members
        });
    }

    if (roomsForReport.length === 0) return {};

    const prompt = `你是一个专业的室友兼容性分析师。请为以下各房间的室友组合生成兼容性分析报告。

## 各房间成员信息
${JSON.stringify(roomsForReport, null, 2)}

## OCEAN指标说明
- O(开放性): 对新事物的接受程度
- C(责任心): 自律、整洁、计划性
- E(外向性): 社交活跃程度  
- A(宜人性): 友善程度、合作意愿
- N(情绪敏感度): 对环境干扰的敏感程度
值域0-100，≤30=低, 30-70=中, ≥70=高

## 要求
为每个房间生成中文兼容性报告，每个报告包含：
1. 兼容度评级（★ 到 ★★★★★）
2. 该组合的优势（1-2点）
3. 潜在摩擦点（如有，1-2点）
4. 一条相处建议

每个报告控制在120字以内，简洁有力。

返回JSON格式：{"房间ID": "报告文本"}
只返回JSON，不要有任何其他文字。`;

    try {
        console.log('[Layer3] 向AI请求兼容性报告...');
        const content = await callDeepSeek(prompt, 0.4);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI响应中无有效JSON');

        const reports = JSON.parse(jsonMatch[0]);
        console.log(`[Layer3] 生成了 ${Object.keys(reports).length} 份兼容性报告`);
        return reports;
    } catch (error) {
        console.error('[Layer3] 生成兼容性报告失败:', error.message);
        return {};
    }
}

// ════════════════════════════════════════════════
//  主入口
// ════════════════════════════════════════════════

async function assignRoommates(applicants, rooms, roomCapacity) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  智能舍友分配开始: ${applicants.length} 人 → ${rooms.length} 间可用房间`);
    console.log(`${'═'.repeat(50)}`);

    // 少于等于一个房间容量，直接分配
    if (applicants.length <= roomCapacity) {
        const targetRoom = rooms.find(r => r.current_occupants > 0 && r.capacity - r.current_occupants >= applicants.length)
            || rooms.find(r => r.capacity - r.current_occupants >= applicants.length);
        if (targetRoom) {
            const assignment = { [targetRoom.room_id]: applicants.map(a => String(a.userId)) };
            const reports = await layer3_generateReports(assignment, applicants, rooms);
            return { assignments: assignment, reports };
        }
    }

    // ── Layer 1: 硬约束分组 ──
    console.log('\n[Layer1] 按作息时间分组...');
    const { sleepGroups, flexibleUsers } = layer1_groupByConstraints(applicants);
    console.log(`[Layer1] 形成 ${sleepGroups.length} 个作息组, ${flexibleUsers.length} 个灵活用户`);
    for (let i = 0; i < sleepGroups.length; i++) {
        const g = sleepGroups[i];
        const times = g.map(u => u.sleep_time_start || '?').join(', ');
        console.log(`  组${i + 1}: ${g.length}人 (入睡: ${times})`);
    }

    const preAssignment = layer1_assignToRooms(sleepGroups, flexibleUsers, rooms, roomCapacity);
    console.log(`[Layer1] 预分配完成: ${Object.keys(preAssignment).length} 间房间`);

    // ── Layer 2: AI 性格兼容性优化 ──
    console.log('\n[Layer2] AI性格兼容性优化...');
    const finalAssignments = await layer2_aiOptimize(preAssignment, applicants, rooms, roomCapacity);
    console.log(`[Layer2] 最终分配: ${Object.keys(finalAssignments).length} 间房间`);

    // ── Layer 3: AI 兼容性报告 ──
    console.log('\n[Layer3] AI生成兼容性报告...');
    const reports = await layer3_generateReports(finalAssignments, applicants, rooms);

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  分配完成! 报告: ${Object.keys(reports).length} 份`);
    console.log(`${'═'.repeat(50)}\n`);

    return { assignments: finalAssignments, reports };
}

module.exports = { assignRoommates };
