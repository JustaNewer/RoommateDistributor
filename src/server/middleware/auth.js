const jwt = require('jsonwebtoken');

// 设置JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// 认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: '未提供认证令牌'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: '令牌无效或已过期'
            });
        }

        req.user = user;
        next();
    });
};

module.exports = {
    authenticateToken,
    JWT_SECRET
}; 