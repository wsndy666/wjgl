const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticateToken, checkOwnership, logOperation } = require('../middleware/auth');

const router = express.Router();

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './data/uploads';
    const userDir = path.join(uploadPath, req.user.id.toString());
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // 保持原始文件名，避免乱码
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueName = uuidv4() + path.extname(originalName);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB
  },
  fileFilter: (req, file, cb) => {
    // 可以在这里添加文件类型限制
    cb(null, true);
  }
});

// 获取文件列表
router.get('/', authenticateToken, (req, res) => {
  const { folder_id, page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT f.*, ft.tags 
    FROM files f
    LEFT JOIN (
      SELECT file_id, GROUP_CONCAT(tag) as tags 
      FROM file_tags 
      GROUP BY file_id
    ) ft ON f.id = ft.file_id
    WHERE f.user_id = ?
  `;
  
  const params = [req.user.id];
  
  if (folder_id) {
    query += ' AND f.folder_id = ?';
    params.push(folder_id);
  } else if (folder_id === null || folder_id === 'null') {
    query += ' AND f.folder_id IS NULL';
  }
  
  if (search) {
    query += ' AND (f.name LIKE ? OR f.original_name LIKE ? OR f.description LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  query += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, files) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM files WHERE user_id = ?';
    const countParams = [req.user.id];
    
    if (folder_id) {
      countQuery += ' AND folder_id = ?';
      countParams.push(folder_id);
    } else if (folder_id === null || folder_id === 'null') {
      countQuery += ' AND folder_id IS NULL';
    }
    
    if (search) {
      countQuery += ' AND (name LIKE ? OR original_name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: '数据库查询错误' });
      }
      
      res.json({
        files,
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

// 上传单个文件
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }

  const { folder_id, description, tags } = req.body;
  const file = req.file;
  
  const fileData = {
    name: file.filename,
    original_name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
    path: file.path,
    size: file.size,
    mime_type: file.mimetype,
    folder_id: folder_id || null,
    user_id: req.user.id,
    description: description || '',
    tags: tags || ''
  };

  db.run(
    `INSERT INTO files (name, original_name, path, size, mime_type, folder_id, user_id, description, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fileData.name,
      fileData.original_name,
      fileData.path,
      fileData.size,
      fileData.mime_type,
      fileData.folder_id,
      fileData.user_id,
      fileData.description,
      fileData.tags
    ],
    function(err) {
      if (err) {
        // 删除已上传的文件
        fs.unlink(file.path, () => {});
        return res.status(500).json({ error: '文件保存失败' });
      }

      // 处理标签
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        tagList.forEach(tag => {
          db.run('INSERT INTO file_tags (file_id, tag) VALUES (?, ?)', [this.lastID, tag]);
        });
      }

      res.status(201).json({
        message: '文件上传成功',
        file: {
          id: this.lastID,
          ...fileData
        }
      });
    }
  );
}, logOperation('upload', 'file'));

// 批量上传文件
router.post('/upload/batch', authenticateToken, upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '没有上传文件' });
  }

  const { folder_id, description, tags } = req.body;
  const uploadedFiles = [];
  let completed = 0;
  let errors = [];

  req.files.forEach((file, index) => {
    const fileData = {
      name: file.filename,
      original_name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      path: file.path,
      size: file.size,
      mime_type: file.mimetype,
      folder_id: folder_id || null,
      user_id: req.user.id,
      description: description || '',
      tags: tags || ''
    };

    db.run(
      `INSERT INTO files (name, original_name, path, size, mime_type, folder_id, user_id, description, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileData.name,
        fileData.original_name,
        fileData.path,
        fileData.size,
        fileData.mime_type,
        fileData.folder_id,
        fileData.user_id,
        fileData.description,
        fileData.tags
      ],
      function(err) {
        completed++;
        
        if (err) {
          errors.push({ file: file.originalname, error: err.message });
          fs.unlink(file.path, () => {});
        } else {
          uploadedFiles.push({
            id: this.lastID,
            ...fileData
          });
        }

        if (completed === req.files.length) {
          res.json({
            message: `批量上传完成，成功 ${uploadedFiles.length} 个文件`,
            files: uploadedFiles,
            errors: errors
          });
        }
      }
    );
  });
}, logOperation('batch_upload', 'file'));

// 下载文件
router.get('/:id/download', authenticateToken, checkOwnership, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM files WHERE id = ?', [id], (err, file) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ error: '文件不存在于磁盘' });
    }

    res.download(file.path, file.original_name, (err) => {
      if (err) {
        console.error('文件下载错误:', err);
      }
    });
  });
}, logOperation('download', 'file'));

// 批量下载文件（ZIP压缩）
router.post('/download', authenticateToken, (req, res) => {
  const { fileIds } = req.body;
  
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: '请选择要下载的文件' });
  }

  const placeholders = fileIds.map(() => '?').join(',');
  const query = `SELECT * FROM files WHERE id IN (${placeholders}) AND user_id = ?`;
  
  db.all(query, [...fileIds, req.user.id], (err, files) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }

    if (files.length === 0) {
      return res.status(404).json({ error: '没有找到文件' });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment('files.zip');
    archive.pipe(res);

    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        archive.file(file.path, { name: file.original_name });
      }
    });

    archive.finalize();
  });
}, logOperation('batch_download', 'file'));

// 更新文件信息
router.put('/:id', authenticateToken, checkOwnership, [
  body('description').optional().isLength({ max: 500 }).withMessage('描述不能超过500字符'),
  body('tags').optional().isLength({ max: 200 }).withMessage('标签不能超过200字符')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { description, tags } = req.body;
  
  const updates = [];
  const values = [];

  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    values.push(tags);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有要更新的字段' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const query = `UPDATE files SET ${updates.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err) {
    if (err) {
      return res.status(500).json({ error: '更新文件信息失败' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 更新标签
    if (tags !== undefined) {
      db.run('DELETE FROM file_tags WHERE file_id = ?', [id], (err) => {
        if (!err && tags) {
          const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          tagList.forEach(tag => {
            db.run('INSERT INTO file_tags (file_id, tag) VALUES (?, ?)', [id, tag]);
          });
        }
      });
    }
    
    res.json({ message: '文件信息更新成功' });
  });
}, logOperation('update', 'file'));

// 锁定/解锁文件
router.post('/:id/lock', authenticateToken, checkOwnership, (req, res) => {
  const { id } = req.params;
  const { isLocked, is_locked } = req.body;
  const lockStatus = isLocked !== undefined ? isLocked : is_locked;
  
  db.run(
    'UPDATE files SET is_locked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [lockStatus ? 1 : 0, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: '操作失败' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '文件不存在' });
      }
      
      res.json({
        message: lockStatus ? '文件已锁定' : '文件已解锁',
        is_locked: !!lockStatus
      });
    }
  );
}, logOperation('lock', 'file'));

// 删除文件
router.delete('/:id', authenticateToken, checkOwnership, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM files WHERE id = ?', [id], (err, file) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }
    
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 删除数据库记录
    db.run('DELETE FROM files WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除文件记录失败' });
      }

      // 删除物理文件
      if (fs.existsSync(file.path)) {
        fs.unlink(file.path, (err) => {
          if (err) {
            console.error('删除物理文件失败:', err);
          }
        });
      }

      res.json({ message: '文件删除成功' });
    });
  });
}, logOperation('delete', 'file'));

// 批量删除文件
router.delete('/batch', authenticateToken, (req, res) => {
  const { fileIds } = req.body;
  
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: '请选择要删除的文件' });
  }

  const placeholders = fileIds.map(() => '?').join(',');
  const query = `SELECT * FROM files WHERE id IN (${placeholders}) AND user_id = ?`;
  
  db.all(query, [...fileIds, req.user.id], (err, files) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }

    let completed = 0;
    let deletedCount = 0;
    let errors = [];

    files.forEach(file => {
      // 删除数据库记录
      db.run('DELETE FROM files WHERE id = ?', [file.id], function(err) {
        completed++;
        
        if (err) {
          errors.push({ file: file.original_name, error: err.message });
        } else {
          deletedCount++;
          // 删除物理文件
          if (fs.existsSync(file.path)) {
            fs.unlink(file.path, (err) => {
              if (err) {
                console.error('删除物理文件失败:', err);
              }
            });
          }
        }

        if (completed === files.length) {
          res.json({
            message: `批量删除完成，成功删除 ${deletedCount} 个文件`,
            deletedCount,
            errors: errors
          });
        }
      });
    });
  });
}, logOperation('batch_delete', 'file'));

module.exports = router;
