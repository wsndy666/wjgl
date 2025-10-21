const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticateToken, checkOwnership, logOperation } = require('../middleware/auth');

const router = express.Router();

// 获取文件夹树结构
router.get('/tree', authenticateToken, (req, res) => {
  const buildTree = (parentId = null) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT f.*, 
               (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count,
               (SELECT COUNT(*) FROM folders WHERE parent_id = f.id) as subfolder_count
        FROM folders f 
        WHERE f.user_id = ? AND f.parent_id ${parentId === null ? 'IS NULL' : '= ?'}
        ORDER BY f.name
      `;
      
      const params = parentId === null ? [req.user.id] : [req.user.id, parentId];
      
      db.all(query, params, async (err, folders) => {
        if (err) {
          reject(err);
          return;
        }
        
        const tree = [];
        for (const folder of folders) {
          const children = await buildTree(folder.id);
          tree.push({
            ...folder,
            children
          });
        }
        
        resolve(tree);
      });
    });
  };

  buildTree()
    .then(tree => {
      res.json({ tree });
    })
    .catch(err => {
      console.error('获取文件夹树错误:', err);
      res.status(500).json({ error: '获取文件夹树失败' });
    });
});

// 获取文件夹列表
router.get('/', authenticateToken, (req, res) => {
  const { parent_id, page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT f.*, 
           (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count,
           (SELECT COUNT(*) FROM folders WHERE parent_id = f.id) as subfolder_count
    FROM folders f
    WHERE f.user_id = ?
  `;
  
  const params = [req.user.id];
  
  if (parent_id !== undefined) {
    if (parent_id === null || parent_id === 'null') {
      query += ' AND f.parent_id IS NULL';
    } else {
      query += ' AND f.parent_id = ?';
      params.push(parent_id);
    }
  }
  
  if (search) {
    query += ' AND f.name LIKE ?';
    params.push(`%${search}%`);
  }
  
  query += ' ORDER BY f.name LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, folders) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM folders WHERE user_id = ?';
    const countParams = [req.user.id];
    
    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === 'null') {
        countQuery += ' AND parent_id IS NULL';
      } else {
        countQuery += ' AND parent_id = ?';
        countParams.push(parent_id);
      }
    }
    
    if (search) {
      countQuery += ' AND name LIKE ?';
      countParams.push(`%${search}%`);
    }
    
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      res.json({
        folders,
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

// 创建文件夹
router.post('/', authenticateToken, [
  body('name').notEmpty().withMessage('文件夹名称不能为空'),
  body('name').isLength({ max: 100 }).withMessage('文件夹名称不能超过100字符'),
  body('parent_id').optional().isInt().withMessage('父文件夹ID必须是整数')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, parent_id } = req.body;
  
  // 检查父文件夹是否存在且属于当前用户
  if (parent_id) {
    db.get('SELECT id FROM folders WHERE id = ? AND user_id = ?', [parent_id, req.user.id], (err, parentFolder) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      if (!parentFolder) {
        return res.status(400).json({ error: '父文件夹不存在' });
      }
      
      createFolder();
    });
  } else {
    createFolder();
  }
  
  function createFolder() {
    // 检查同级文件夹名称是否重复
    const checkQuery = 'SELECT id FROM folders WHERE name = ? AND user_id = ? AND parent_id ' + 
                      (parent_id ? '= ?' : 'IS NULL');
    const checkParams = parent_id ? [name, req.user.id, parent_id] : [name, req.user.id];
    
    db.get(checkQuery, checkParams, (err, existingFolder) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      if (existingFolder) {
        return res.status(400).json({ error: '文件夹名称已存在' });
      }
      
      // 创建文件夹路径
      const folderPath = parent_id ? 
        path.join(process.env.UPLOAD_PATH || './data/uploads', req.user.id.toString(), parent_id.toString(), name) :
        path.join(process.env.UPLOAD_PATH || './data/uploads', req.user.id.toString(), name);
      
      // 创建物理文件夹
      fs.mkdirSync(folderPath, { recursive: true });
      
      // 保存到数据库
      db.run(
        'INSERT INTO folders (name, parent_id, path, user_id) VALUES (?, ?, ?, ?)',
        [name, parent_id || null, folderPath, req.user.id],
        function(err) {
          if (err) {
            // 删除已创建的物理文件夹
            fs.rmdir(folderPath, () => {});
            return res.status(500).json({ error: '创建文件夹失败' });
          }
          
          res.status(201).json({
            message: '文件夹创建成功',
            folder: {
              id: this.lastID,
              name,
              parent_id: parent_id || null,
              path: folderPath,
              user_id: req.user.id
            }
          });
        }
      );
    });
  }
}, logOperation('create', 'folder'));

// 更新文件夹
router.put('/:id', authenticateToken, checkOwnership, [
  body('name').notEmpty().withMessage('文件夹名称不能为空'),
  body('name').isLength({ max: 100 }).withMessage('文件夹名称不能超过100字符')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name } = req.body;
  
  // 获取当前文件夹信息
  db.get('SELECT * FROM folders WHERE id = ?', [id], (err, folder) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    if (!folder) {
      return res.status(404).json({ error: '文件夹不存在' });
    }
    
    // 检查同级文件夹名称是否重复
    const checkQuery = 'SELECT id FROM folders WHERE name = ? AND user_id = ? AND parent_id ' + 
                      (folder.parent_id ? '= ?' : 'IS NULL') + ' AND id != ?';
    const checkParams = folder.parent_id ? 
      [name, req.user.id, folder.parent_id, id] : 
      [name, req.user.id, id];
    
    db.get(checkQuery, checkParams, (err, existingFolder) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      if (existingFolder) {
        return res.status(400).json({ error: '文件夹名称已存在' });
      }
      
      // 更新数据库
      db.run(
        'UPDATE folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '更新文件夹失败' });
          }
          
          // 重命名物理文件夹
          const newPath = path.join(path.dirname(folder.path), name);
          fs.rename(folder.path, newPath, (err) => {
            if (err) {
              console.error('重命名物理文件夹失败:', err);
            }
            
            // 更新路径
            db.run('UPDATE folders SET path = ? WHERE id = ?', [newPath, id]);
          });
          
          res.json({ message: '文件夹更新成功' });
        }
      );
    });
  });
}, logOperation('update', 'folder'));

// 删除文件夹
router.delete('/:id', authenticateToken, checkOwnership, (req, res) => {
  const { id } = req.params;
  
  // 检查文件夹是否为空
  db.get(
    'SELECT COUNT(*) as file_count FROM files WHERE folder_id = ?',
    [id],
    (err, fileResult) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      if (fileResult.file_count > 0) {
        return res.status(400).json({ error: '文件夹不为空，无法删除' });
      }
      
      // 检查是否有子文件夹
      db.get(
        'SELECT COUNT(*) as folder_count FROM folders WHERE parent_id = ?',
        [id],
        (err, folderResult) => {
          if (err) {
            return res.status(500).json({ error: '数据库查询错误' });
          }
          
          if (folderResult.folder_count > 0) {
            return res.status(400).json({ error: '文件夹包含子文件夹，无法删除' });
          }
          
          // 获取文件夹信息
          db.get('SELECT * FROM folders WHERE id = ?', [id], (err, folder) => {
            if (err) {
              return res.status(500).json({ error: '数据库查询错误' });
            }
            
            // 删除数据库记录
            db.run('DELETE FROM folders WHERE id = ?', [id], function(err) {
              if (err) {
                return res.status(500).json({ error: '删除文件夹失败' });
              }
              
              // 删除物理文件夹
              if (fs.existsSync(folder.path)) {
                fs.rmdir(folder.path, (err) => {
                  if (err) {
                    console.error('删除物理文件夹失败:', err);
                  }
                });
              }
              
              res.json({ message: '文件夹删除成功' });
            });
          });
        }
      );
    }
  );
}, logOperation('delete', 'folder'));

// 移动文件夹
router.put('/:id/move', authenticateToken, checkOwnership, [
  body('parent_id').optional().isInt().withMessage('父文件夹ID必须是整数')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { parent_id } = req.body;
  
  // 检查不能移动到自己的子文件夹
  if (parent_id) {
    const checkCircular = (currentId, targetParentId) => {
      return new Promise((resolve, reject) => {
        if (currentId == targetParentId) {
          resolve(true);
          return;
        }
        
        db.get('SELECT parent_id FROM folders WHERE id = ?', [targetParentId], (err, parent) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!parent || !parent.parent_id) {
            resolve(false);
            return;
          }
          
          checkCircular(currentId, parent.parent_id).then(resolve).catch(reject);
        });
      });
    };
    
    checkCircular(id, parent_id).then(isCircular => {
      if (isCircular) {
        return res.status(400).json({ error: '不能将文件夹移动到自己的子文件夹中' });
      }
      
      performMove();
    }).catch(err => {
      res.status(500).json({ error: '检查移动路径失败' });
    });
  } else {
    performMove();
  }
  
  function performMove() {
    // 检查目标父文件夹是否存在
    if (parent_id) {
      db.get('SELECT id FROM folders WHERE id = ? AND user_id = ?', [parent_id, req.user.id], (err, targetParent) => {
        if (err) {
          return res.status(500).json({ error: '数据库查询错误' });
        }
        
        if (!targetParent) {
          return res.status(400).json({ error: '目标父文件夹不存在' });
        }
        
        updateFolder();
      });
    } else {
      updateFolder();
    }
  }
  
  function updateFolder() {
    // 更新数据库
    db.run(
      'UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [parent_id || null, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '移动文件夹失败' });
        }
        
        res.json({ message: '文件夹移动成功' });
      }
    );
  }
}, logOperation('move', 'folder'));

module.exports = router;
