const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { initDatabase, db } = require('./database/db');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const folderRoutes = require('./routes/folders');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3001;

// 创建必要的目录
const uploadDir = process.env.UPLOAD_PATH || './data/uploads';
const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : './data';

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('Query:', JSON.stringify(req.query, null, 2));
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制每个IP 15分钟内最多1000个请求
  message: '请求过于频繁，请稍后重试'
});
app.use('/api/', limiter);

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 获取仪表盘统计数据
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  // 获取用户统计
  const userStatsQuery = `
    SELECT 
      COUNT(DISTINCT f.id) as total_files,
      COUNT(DISTINCT fo.id) as total_folders,
      COALESCE(SUM(f.size), 0) as total_size
    FROM files f
    LEFT JOIN folders fo ON fo.user_id = ?
    WHERE f.user_id = ?
  `;
  
  db.get(userStatsQuery, [userId, userId], (err, userStats) => {
    if (err) {
      return res.status(500).json({ error: '获取用户统计失败' });
    }
    
    if (isAdmin) {
      // 获取系统统计（仅管理员）
      const systemStatsQuery = `
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT f.id) as total_files,
          COUNT(DISTINCT fo.id) as total_folders,
          COALESCE(SUM(f.size), 0) as total_size,
          COUNT(DISTINCT CASE WHEN u.created_at > datetime('now', '-30 days') THEN u.id END) as new_users_30d,
          COUNT(DISTINCT CASE WHEN f.created_at > datetime('now', '-30 days') THEN f.id END) as new_files_30d
        FROM users u
        LEFT JOIN files f ON f.user_id = u.id
        LEFT JOIN folders fo ON fo.user_id = u.id
      `;
      
      db.get(systemStatsQuery, [], (err, systemStats) => {
        if (err) {
          return res.status(500).json({ error: '获取系统统计失败' });
        }
        
        res.json({
          userStats,
          systemStats,
          isAdmin: true
        });
      });
    } else {
      res.json({
        userStats,
        isAdmin: false
      });
    }
  });
});

// 获取最近活动
app.get('/api/dashboard/activity', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  let query = `
    SELECT ol.*, u.username
    FROM operation_logs ol
    LEFT JOIN users u ON u.id = ol.user_id
  `;
  
  const params = [];
  
  if (!isAdmin) {
    query += ' WHERE ol.user_id = ?';
    params.push(userId);
  }
  
  query += ' ORDER BY ol.created_at DESC LIMIT 10';
  
  db.all(query, params, (err, activities) => {
    if (err) {
      return res.status(500).json({ error: '获取活动记录失败' });
    }
    
    res.json({ activities });
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404处理
app.use('*', (req, res) => {
  console.log(`404 - 接口不存在: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: '接口不存在' });
});

// 初始化数据库并启动服务器
initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
      console.log('数据库初始化完成');
    });
  })
  .catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
