const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 用户注册
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('用户名至少3个字符'),
  body('email').isEmail().withMessage('邮箱格式不正确'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

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
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '创建用户失败' });
          }
          
          res.status(201).json({ 
            message: '用户创建成功',
            userId: this.lastID 
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户登录
router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  db.get(
    'SELECT id, username, email, password, role FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      // 生成JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: '登录成功',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    }
  );
});

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, role, avatar, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      res.json({ user });
    }
  );
});

// 更新用户信息
router.put('/profile', authenticateToken, [
  body('email').optional().isEmail().withMessage('邮箱格式不正确'),
  body('avatar').optional().isURL().withMessage('头像必须是有效的URL')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, avatar } = req.body;
  const updates = [];
  const values = [];

  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (avatar) {
    updates.push('avatar = ?');
    values.push(avatar);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.user.id);

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err) {
    if (err) {
      return res.status(500).json({ error: '更新用户信息失败' });
    }
    
    res.json({ message: '用户信息更新成功' });
  });
});

// 修改密码
router.put('/password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('当前密码不能为空'),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6个字符')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  // 验证当前密码
  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: '当前密码错误' });
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '密码更新失败' });
        }
        
        res.json({ message: '密码更新成功' });
      }
    );
  });
});

// 登出（客户端处理token删除）
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: '登出成功' });
});

module.exports = router;
