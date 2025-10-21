const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticateToken, requireAdmin, logOperation } = require('../middleware/auth');

const router = express.Router();

// 获取用户列表（仅管理员）
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT id, username, email, role, avatar, created_at, updated_at
    FROM users
  `;
  
  const params = [];
  
  if (search) {
    query += ' WHERE username LIKE ? OR email LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, users) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const countParams = [];
    
    if (search) {
      countQuery += ' WHERE username LIKE ? OR email LIKE ?';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// 获取用户详情
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  // 普通用户只能查看自己的信息，管理员可以查看所有用户
  const userId = req.user.role === 'admin' ? id : req.user.id;
  
  db.get(
    'SELECT id, username, email, role, avatar, created_at, updated_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      // 获取用户统计信息
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM files WHERE user_id = ?) as file_count,
          (SELECT COUNT(*) FROM folders WHERE user_id = ?) as folder_count,
          (SELECT COALESCE(SUM(size), 0) FROM files WHERE user_id = ?) as total_size
      `;
      
      db.get(statsQuery, [userId, userId, userId], (err, stats) => {
        if (err) {
          return res.status(500).json({ error: '获取用户统计信息失败' });
        }
        
        res.json({
          user: {
            ...user,
            stats
          }
        });
      });
    }
  );
});

// 创建用户（仅管理员）
router.post('/', authenticateToken, requireAdmin, [
  body('username').isLength({ min: 3 }).withMessage('用户名至少3个字符'),
  body('email').isEmail().withMessage('邮箱格式不正确'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
  body('role').optional().isIn(['user', 'admin']).withMessage('角色无效')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role = 'user' } = req.body;

  // 检查用户是否已存在
  db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    if (row) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '创建用户失败' });
        }
        
        res.status(201).json({ 
          message: '用户创建成功',
          user: {
            id: this.lastID,
            username,
            email,
            role
          }
        });
      }
    );
  });
}, logOperation('create', 'user'));

// 更新用户信息
router.put('/:id', authenticateToken, [
  body('email').optional().isEmail().withMessage('邮箱格式不正确'),
  body('role').optional().isIn(['user', 'admin']).withMessage('角色无效'),
  body('avatar').optional().isURL().withMessage('头像必须是有效的URL')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { email, role, avatar } = req.body;
  
  // 普通用户只能更新自己的信息，且不能修改角色
  const canUpdate = req.user.role === 'admin' || req.user.id == id;
  if (!canUpdate) {
    return res.status(403).json({ error: '无权限修改此用户信息' });
  }
  
  // 普通用户不能修改角色
  if (req.user.role !== 'admin' && role) {
    return res.status(403).json({ error: '无权限修改用户角色' });
  }
  
  const updates = [];
  const values = [];

  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (role && req.user.role === 'admin') {
    updates.push('role = ?');
    values.push(role);
  }
  if (avatar) {
    updates.push('avatar = ?');
    values.push(avatar);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err) {
    if (err) {
      return res.status(500).json({ error: '更新用户信息失败' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ message: '用户信息更新成功' });
  });
}, logOperation('update', 'user'));

// 重置用户密码（仅管理员）
router.put('/:id/password', authenticateToken, requireAdmin, [
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { password } = req.body;
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run(
    'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hashedPassword, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '重置密码失败' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      res.json({ message: '密码重置成功' });
    }
  );
}, logOperation('reset_password', 'user'));

// 删除用户（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // 不能删除自己
  if (req.user.id == id) {
    return res.status(400).json({ error: '不能删除自己的账户' });
  }
  
  // 检查用户是否存在
  db.get('SELECT id FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 删除用户（级联删除相关数据）
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除用户失败' });
      }
      
      res.json({ message: '用户删除成功' });
    });
  });
}, logOperation('delete', 'user'));

// 获取用户操作日志
router.get('/:id/logs', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  // 普通用户只能查看自己的日志，管理员可以查看所有用户日志
  const userId = req.user.role === 'admin' ? id : req.user.id;
  
  const query = `
    SELECT ol.*, u.username
    FROM operation_logs ol
    JOIN users u ON ol.user_id = u.id
    WHERE ol.user_id = ?
    ORDER BY ol.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  db.all(query, [userId, parseInt(limit), offset], (err, logs) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    // 获取总数
    db.get(
      'SELECT COUNT(*) as total FROM operation_logs WHERE user_id = ?',
      [userId],
      (err, countResult) => {
        if (err) {
          return res.status(500).json({ error: '数据库查询错误' });
        }
        
        res.json({
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.total,
            pages: Math.ceil(countResult.total / limit)
          }
        });
      }
    );
  });
});

// 获取系统统计信息（仅管理员）
router.get('/stats/overview', authenticateToken, requireAdmin, (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM files) as total_files,
      (SELECT COUNT(*) FROM folders) as total_folders,
      (SELECT COALESCE(SUM(size), 0) FROM files) as total_size,
      (SELECT COUNT(*) FROM users WHERE created_at >= date('now', '-30 days')) as new_users_30d,
      (SELECT COUNT(*) FROM files WHERE created_at >= date('now', '-30 days')) as new_files_30d
  `;
  
  db.get(statsQuery, [], (err, stats) => {
    if (err) {
      return res.status(500).json({ error: '获取统计信息失败' });
    }
    
    // 获取最近活动
    const recentActivityQuery = `
      SELECT ol.*, u.username
      FROM operation_logs ol
      JOIN users u ON ol.user_id = u.id
      ORDER BY ol.created_at DESC
      LIMIT 10
    `;
    
    db.all(recentActivityQuery, [], (err, recentActivity) => {
      if (err) {
        return res.status(500).json({ error: '获取最近活动失败' });
      }
      
      res.json({
        stats,
        recentActivity
      });
    });
  });
});

module.exports = router;
