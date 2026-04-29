const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.warn('\n[启动警告] 未找到 src/server/.env 文件。');
    console.warn('请参考 src/server/.env.example 创建 .env，并填入数据库与 API Key。\n');
}
require('dotenv').config({ path: envPath });

// 关键环境变量自检
const REQUIRED_ENV = ['DEEPSEEK_API_KEY'];
const OPTIONAL_ENV = ['SILICONFLOW_API_KEY', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'];
const missingRequired = REQUIRED_ENV.filter(k => !process.env[k]);
const missingOptional = OPTIONAL_ENV.filter(k => !process.env[k]);
if (missingRequired.length) {
    console.error('\n[启动错误] 缺少必要环境变量：' + missingRequired.join(', '));
    console.error('请在 src/server/.env 中配置后重新启动。\n');
    process.exit(1);
}
if (missingOptional.length) {
    console.warn('[启动提示] 以下可选环境变量未设置，相关功能将不可用：' + missingOptional.join(', '));
}

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
const server = app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[启动错误] 端口 ${PORT} 已被占用。`);
        console.error('请关闭占用该端口的进程，或在 src/server/.env 中修改 PORT 后重启。\n');
    } else {
        console.error('\n[启动错误]', err.message, '\n');
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('[未处理的Promise拒绝]', reason);
});
