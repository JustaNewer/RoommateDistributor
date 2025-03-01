const crypto = require('crypto');

// 生成宿舍哈希
const generateDormHash = (dormData) => {
    // 组合熵源
    const entropySource = {
        ...dormData,
        timestamp: Date.now(),  // 添加时间戳作为额外熵源
        random: Math.random(),  // 添加随机数作为额外熵源
    };

    // 将对象转换为排序后的字符串，确保相同的数据生成相同的哈希
    const sortedString = Object.keys(entropySource)
        .sort()
        .map(key => `${key}:${entropySource[key]}`)
        .join('|');

    // 使用SHA256生成哈希
    return crypto
        .createHash('sha256')
        .update(sortedString)
        .digest('hex');
};

module.exports = {
    generateDormHash
}; 