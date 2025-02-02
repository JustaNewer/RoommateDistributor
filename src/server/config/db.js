const mysql = require('mysql2');

// 创建数据库连接池
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',  // 请根据实际情况修改用户名
    password: '011312',  // 请根据实际情况修改密码
    database: 'roommateallocation',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 将连接池转换为Promise方式
const promisePool = pool.promise();

module.exports = promisePool; 