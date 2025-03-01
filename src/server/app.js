const express = require('express');
const app = express();
const dormRoutes = require('./routes/dorm');

// 中间件
app.use(express.json());

// 路由
app.use('/api/dorm', dormRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: '服务器错误'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app; 