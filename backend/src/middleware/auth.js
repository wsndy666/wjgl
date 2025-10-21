const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 验证管理员权限
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// 验证文件/文件夹所有权
const checkOwnership = (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const resourceType = req.baseUrl.includes('files') ? 'files' : 'folders';

  const query = `SELECT user_id FROM ${resourceType} WHERE id = ?`;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    if (!row) {
      return res.status(404).json({ error: '资源不存在' });
    }
    
    if (row.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权限访问此资源' });
    }
    
    next();
  });
};

// 记录操作日志
const logOperation = (action, targetType, targetId, details = '') => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // 记录操作日志
      const logQuery = `
        INSERT INTO operation_logs (user_id, action, target_type, target_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(logQuery, [
        req.user.id,
        action,
        targetType,
        targetId,
        details,
        req.ip || req.connection.remoteAddress
      ], (err) => {
        if (err) {
          console.error('记录操作日志失败:', err);
        }
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  checkOwnership,
  logOperation
};
