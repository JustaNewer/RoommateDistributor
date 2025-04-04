require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const avatarRoutes = require('./routes/avatar');
const userRoutes = require('./routes/user');
const dormRoutes = require('./routes/dorm');  // 添加宿舍路由

const app = express();

// 中间件
app.use(cors());  // 启用CORS
app.use(express.json());  // 解析JSON请求体

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dorm', dormRoutes);  // 注册宿舍路由

// 处理404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API路径不存在'
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 