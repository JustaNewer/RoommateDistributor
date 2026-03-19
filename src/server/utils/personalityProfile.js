/**
 * 确定性性格画像生成器
 * 相同的9维向量输入 → 永远输出完全一致的自然语言文本（一字不差）
 *
 * 9维向量对应：
 *   q1: 开放性(O)
 *   q2: 责任心-计划(C)    ─┐
 *   q5: 责任心-公共事务(C) ─┤ C = avg(q2, q5, q9)
 *   q9: 责任心-整洁(C)    ─┘
 *   q3: 安静需求(N)       ─┐ N = avg(q3, q8)
 *   q8: 神经质(N)         ─┘
 *   q4: 外向性(E)
 *   q6: 宜人性-共享(A)    ─┐ A = avg(q6, q7)
 *   q7: 宜人性-沟通(A)    ─┘
 */

// ── Step 1: 9D → OCEAN 归一化(0-100) ──

function vectorToOCEAN(v) {
    const raw = {
        O: v[0],
        C: (v[1] + v[4] + v[8]) / 3,
        E: v[3],
        A: (v[5] + v[6]) / 2,
        N: (v[2] + v[7]) / 2,
    };
    const norm = x => (x - 1) / 4 * 100;
    return {
        O: norm(raw.O),
        C: norm(raw.C),
        E: norm(raw.E),
        A: norm(raw.A),
        N: norm(raw.N),
    };
}

// ── Step 2: 离散化 ──

function getLevel(score) {
    if (score <= 30) return 'low';
    if (score >= 70) return 'high';
    return 'mid';
}

// ── Step 3: 每个维度在各水平的固定描述 ──

const DESC = {
    O: {
        high: '思维开放富有创造力，乐于接受新事物和不同的生活方式',
        mid:  '对新事物保持适度好奇，能在创新与传统之间取得平衡',
        low:  '偏好熟悉的环境和方式，注重生活的稳定性与确定性',
    },
    C: {
        high: '高度自律且做事有条理，注重整洁与计划执行',
        mid:  '具备基本的自律和规划能力，能灵活应对变化',
        low:  '性格随性洒脱，不拘泥于严格的计划和细节',
    },
    E: {
        high: '性格外向精力充沛，热衷社交活动与群体互动',
        mid:  '社交适度均衡，既能享受群体活动也能安静独处',
        low:  '性格内敛沉静，偏好独处或小范围的深度交流',
    },
    A: {
        high: '待人友善热情，乐于分享物品并善于沟通协作',
        mid:  '与人相处融洽，能在合作共享与个人空间间保持平衡',
        low:  '独立性强注重个人边界，偏好保持适当的社交距离',
    },
    N: {
        high: '情绪较为敏感细腻，对环境噪音和干扰比较在意',
        mid:  '情绪基本稳定，对周围环境有一定的适应弹性',
        low:  '情绪非常稳定从容，对环境变化有很强的适应力',
    },
};

// ── Step 4: 原型定义与欧氏距离匹配 ──
// 顺序固定，距离相同时取先出现的（保证确定性）

const PROTOTYPES = [
    { name: '学术钻研型', vec: [80, 85, 25, 50, 55] },
    { name: '社交活力型', vec: [65, 35, 85, 80, 20] },
    { name: '自律沉稳型', vec: [40, 85, 30, 50, 30] },
    { name: '随和开朗型', vec: [55, 40, 75, 85, 25] },
    { name: '安静细腻型', vec: [50, 55, 25, 50, 80] },
    { name: '独立自主型', vec: [30, 70, 25, 25, 30] },
    { name: '活力创新型', vec: [85, 50, 85, 55, 20] },
    { name: '温和均衡型', vec: [50, 50, 50, 65, 40] },
];

function euclidean(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
}

function matchPrototype(ocean) {
    const vec = [ocean.O, ocean.C, ocean.E, ocean.A, ocean.N];
    let best = PROTOTYPES[0].name;
    let bestDist = Infinity;
    for (const p of PROTOTYPES) {
        const d = euclidean(vec, p.vec);
        if (d < bestDist) {
            bestDist = d;
            best = p.name;
        }
    }
    return best;
}

// ── Step 5: 组合规则（特殊标注） ──

function getSpecialNotes(levels) {
    const notes = [];
    if (levels.C === 'high' && levels.E === 'low')  notes.push('高度自律且偏内向');
    if (levels.N === 'high')                         notes.push('建议安排较为安静的住宿环境');
    if (levels.E === 'high' && levels.A === 'low')   notes.push('社交活跃但注重个人边界');
    if (levels.C === 'high' && levels.A === 'high')  notes.push('善于合作的理想室友类型');
    if (levels.E === 'high' && levels.N === 'low')   notes.push('阳光开朗且适应力强');
    if (levels.O === 'high' && levels.C === 'low')   notes.push('创意丰富但生活较为随性');
    if (levels.E === 'low'  && levels.N === 'high')  notes.push('偏好安静独处的环境');
    if (levels.C === 'low'  && levels.N === 'high')  notes.push('需要室友在生活习惯上多包容');
    return notes;
}

// ── Step 6: 室友建议 ──

function getRoommateTips(levels) {
    const tips = [];
    if (levels.N === 'high') {
        tips.push('适合与安静自律的室友同住');
    } else if (levels.N === 'low') {
        tips.push('能适应各类室友的生活节奏');
    }
    if (levels.E === 'high') {
        tips.push('适合与同样外向或包容性强的室友同住');
    } else if (levels.E === 'low') {
        tips.push('适合与尊重个人空间的室友同住');
    }
    if (levels.C === 'high') {
        tips.push('与同样注重整洁规律的室友更融洽');
    } else if (levels.C === 'low') {
        tips.push('与包容度高的室友相处更轻松');
    }
    return tips;
}

// ── 主入口 ──

function generateProfile(vector) {
    if (!Array.isArray(vector) || vector.length !== 9) {
        return null;
    }

    const ocean = vectorToOCEAN(vector);
    const levels = {
        O: getLevel(ocean.O),
        C: getLevel(ocean.C),
        E: getLevel(ocean.E),
        A: getLevel(ocean.A),
        N: getLevel(ocean.N),
    };

    const typeName = matchPrototype(ocean);

    const traits = [
        DESC.O[levels.O],
        DESC.C[levels.C],
        DESC.E[levels.E],
        DESC.A[levels.A],
        DESC.N[levels.N],
    ].join('；');

    const specialNotes = getSpecialNotes(levels);
    const tips = getRoommateTips(levels);

    let profile = `【${typeName}】${traits}`;

    if (specialNotes.length > 0) {
        profile += `。特别说明：${specialNotes.join('，')}`;
    }

    if (tips.length > 0) {
        profile += `。室友建议：${tips.join('，')}`;
    }

    profile += '。';

    return profile;
}

module.exports = { generateProfile, vectorToOCEAN, getLevel };
