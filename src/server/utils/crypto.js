const crypto = require('crypto');

// SHA256加密函数
const hashPassword = (password) => {
    return crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
};

module.exports = {
    hashPassword
}; 