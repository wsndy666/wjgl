const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 全局搜索
router.get('/', authenticateToken, (req, res) => {
  console.log('搜索请求参数:', req.query);
  
  const { 
    q, 
    type = 'all', // all, files, folders
    mime_type,
    size_min,
    size_max,
    date_from,
    date_to,
    tags,
    page = 1, 
    limit = 20 
  } = req.query;
  
  const offset = (page - 1) * limit;
  
  // 如果没有搜索关键词，返回空结果而不是错误
  if (!q || q.trim().length === 0) {
    return res.json({
      success: true,
      data: {
        files: [],
        folders: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0
      }
    });
  }
  
  let query = '';
  let params = [req.user.id];
  let countQuery = '';
  let countParams = [req.user.id];
  
  if (type === 'files' || type === 'all') {
    // 搜索文件
    let fileQuery = `
      SELECT f.*, ft.tags,
             CASE 
               WHEN f.name LIKE ? THEN 1
               WHEN f.original_name LIKE ? THEN 2
               WHEN f.description LIKE ? THEN 3
               ELSE 4
             END as relevance
      FROM files f
      LEFT JOIN (
        SELECT file_id, GROUP_CONCAT(tag) as tags 
        FROM file_tags 
        GROUP BY file_id
      ) ft ON f.id = ft.file_id
      WHERE f.user_id = ?
    `;
    
    const searchTerm = `%${q}%`;
    fileQuery += ' AND (f.name LIKE ? OR f.original_name LIKE ? OR f.description LIKE ?)';
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    
    // 添加过滤条件
    if (mime_type) {
      fileQuery += ' AND f.mime_type LIKE ?';
      params.push(`%${mime_type}%`);
    }
    
    if (size_min) {
      fileQuery += ' AND f.size >= ?';
      params.push(parseInt(size_min));
    }
    
    if (size_max) {
      fileQuery += ' AND f.size <= ?';
      params.push(parseInt(size_max));
    }
    
    if (date_from) {
      fileQuery += ' AND f.created_at >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      fileQuery += ' AND f.created_at <= ?';
      params.push(date_to);
    }
    
    if (tags) {
      fileQuery += ' AND f.id IN (SELECT file_id FROM file_tags WHERE tag LIKE ?)';
      params.push(`%${tags}%`);
    }
    
    fileQuery += ' ORDER BY relevance, f.created_at DESC';
    
    query = fileQuery;
    countQuery = `
      SELECT COUNT(*) as total 
      FROM files f 
      WHERE f.user_id = ? AND (f.name LIKE ? OR f.original_name LIKE ? OR f.description LIKE ?)
    `;
    countParams = [req.user.id, searchTerm, searchTerm, searchTerm];
    
    // 添加文件过滤条件到计数查询
    if (mime_type) {
      countQuery += ' AND f.mime_type LIKE ?';
      countParams.push(`%${mime_type}%`);
    }
    
    if (size_min) {
      countQuery += ' AND f.size >= ?';
      countParams.push(parseInt(size_min));
    }
    
    if (size_max) {
      countQuery += ' AND f.size <= ?';
      countParams.push(parseInt(size_max));
    }
    
    if (date_from) {
      countQuery += ' AND f.created_at >= ?';
      countParams.push(date_from);
    }
    
    if (date_to) {
      countQuery += ' AND f.created_at <= ?';
      countParams.push(date_to);
    }
    
    if (tags) {
      countQuery += ' AND f.id IN (SELECT file_id FROM file_tags WHERE tag LIKE ?)';
      countParams.push(`%${tags}%`);
    }
  }
  
  if (type === 'folders' || type === 'all') {
    // 搜索文件夹
    let folderQuery = `
      SELECT f.*, 
             (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count,
             (SELECT COUNT(*) FROM folders WHERE parent_id = f.id) as subfolder_count,
             CASE 
               WHEN f.name LIKE ? THEN 1
               ELSE 2
             END as relevance
      FROM folders f
      WHERE f.user_id = ? AND f.name LIKE ?
    `;
    
    const searchTerm = `%${q}%`;
    folderQuery += ' ORDER BY relevance, f.name';
    
    if (type === 'folders') {
      query = folderQuery;
      params = [searchTerm, req.user.id, searchTerm];
      countQuery = 'SELECT COUNT(*) as total FROM folders WHERE user_id = ? AND name LIKE ?';
      countParams = [req.user.id, searchTerm];
    } else {
      // 合并查询
      query = `
        ${query}
        UNION ALL
        ${folderQuery}
        ORDER BY relevance, created_at DESC
      `;
      params = [...params, searchTerm, req.user.id, searchTerm];
      countQuery = `
        (${countQuery})
        UNION ALL
        (SELECT COUNT(*) as total FROM folders WHERE user_id = ? AND name LIKE ?)
      `;
      countParams = [...countParams, req.user.id, searchTerm];
    }
  }
  
  // 添加分页
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  // 执行查询
  db.all(query, params, (err, results) => {
    if (err) {
      console.error('搜索查询错误:', err);
      return res.status(500).json({ error: '搜索失败' });
    }
    
    // 获取总数
    if (type === 'all') {
      // 对于合并查询，需要分别计算
      const fileCountQuery = countQuery.split('UNION ALL')[0];
      const folderCountQuery = countQuery.split('UNION ALL')[1];
      
      db.get(fileCountQuery, countParams.slice(0, -2), (err, fileCount) => {
        if (err) {
          return res.status(500).json({ error: '获取搜索结果总数失败' });
        }
        
        db.get(folderCountQuery, countParams.slice(-2), (err, folderCount) => {
          if (err) {
            return res.status(500).json({ error: '获取搜索结果总数失败' });
          }
          
          const total = (fileCount?.total || 0) + (folderCount?.total || 0);
          
          res.json({
            results,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              pages: Math.ceil(total / limit)
            }
          });
        });
      });
    } else {
      db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
          return res.status(500).json({ error: '获取搜索结果总数失败' });
        }
        
        res.json({
          results,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.total,
            pages: Math.ceil(countResult.total / limit)
          }
        });
      });
    }
  });
});

// 高级搜索
router.post('/advanced', authenticateToken, [
  body('query').optional().isLength({ max: 200 }).withMessage('搜索关键词不能超过200字符'),
  body('type').optional().isIn(['all', 'files', 'folders']).withMessage('搜索类型无效'),
  body('filters').optional().isObject().withMessage('过滤条件必须是对象')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    query: searchQuery, 
    type = 'all', 
    filters = {},
    page = 1, 
    limit = 20 
  } = req.body;
  
  const offset = (page - 1) * limit;
  
  // 构建搜索条件
  let whereConditions = ['user_id = ?'];
  let params = [req.user.id];
  
  if (searchQuery && searchQuery.trim()) {
    whereConditions.push('(name LIKE ? OR original_name LIKE ? OR description LIKE ?)');
    const searchTerm = `%${searchQuery}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  // 应用过滤条件
  if (filters.mime_type) {
    whereConditions.push('mime_type LIKE ?');
    params.push(`%${filters.mime_type}%`);
  }
  
  if (filters.size_min) {
    whereConditions.push('size >= ?');
    params.push(parseInt(filters.size_min));
  }
  
  if (filters.size_max) {
    whereConditions.push('size <= ?');
    params.push(parseInt(filters.size_max));
  }
  
  if (filters.date_from) {
    whereConditions.push('created_at >= ?');
    params.push(filters.date_from);
  }
  
  if (filters.date_to) {
    whereConditions.push('created_at <= ?');
    params.push(filters.date_to);
  }
  
  if (filters.tags && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map(() => '?').join(',');
    whereConditions.push(`id IN (SELECT file_id FROM file_tags WHERE tag IN (${tagPlaceholders}))`);
    params.push(...filters.tags);
  }
  
  if (filters.is_locked !== undefined) {
    whereConditions.push('is_locked = ?');
    params.push(filters.is_locked ? 1 : 0);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // 构建查询
  let query = '';
  let countQuery = '';
  
  if (type === 'files' || type === 'all') {
    query = `
      SELECT f.*, ft.tags
      FROM files f
      LEFT JOIN (
        SELECT file_id, GROUP_CONCAT(tag) as tags 
        FROM file_tags 
        GROUP BY file_id
      ) ft ON f.id = ft.file_id
      WHERE ${whereClause}
      ORDER BY f.created_at DESC
    `;
    
    countQuery = `SELECT COUNT(*) as total FROM files WHERE ${whereClause}`;
  }
  
  if (type === 'folders' || type === 'all') {
    const folderWhereClause = whereClause.replace(/original_name|description|mime_type|size|is_locked/g, 'name');
    
    if (type === 'folders') {
      query = `
        SELECT f.*, 
               (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count,
               (SELECT COUNT(*) FROM folders WHERE parent_id = f.id) as subfolder_count
        FROM folders f
        WHERE ${folderWhereClause}
        ORDER BY f.name
      `;
      
      countQuery = `SELECT COUNT(*) as total FROM folders WHERE ${folderWhereClause}`;
    } else {
      // 合并查询
      query = `
        ${query}
        UNION ALL
        SELECT f.*, 
               (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count,
               (SELECT COUNT(*) FROM folders WHERE parent_id = f.id) as subfolder_count,
               NULL as tags
        FROM folders f
        WHERE ${folderWhereClause}
        ORDER BY created_at DESC
      `;
    }
  }
  
  // 添加分页
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  // 执行查询
  db.all(query, params, (err, results) => {
    if (err) {
      console.error('高级搜索查询错误:', err);
      return res.status(500).json({ error: '高级搜索失败' });
    }
    
    // 获取总数
    if (type === 'all') {
      // 分别计算文件和文件夹数量
      const fileCountQuery = countQuery;
      const folderCountQuery = countQuery.replace('files', 'folders');
      
      db.get(fileCountQuery, params.slice(0, -2), (err, fileCount) => {
        if (err) {
          return res.status(500).json({ error: '获取搜索结果总数失败' });
        }
        
        db.get(folderCountQuery, params.slice(0, -2), (err, folderCount) => {
          if (err) {
            return res.status(500).json({ error: '获取搜索结果总数失败' });
          }
          
          const total = (fileCount?.total || 0) + (folderCount?.total || 0);
          
          res.json({
            results,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              pages: Math.ceil(total / limit)
            }
          });
        });
      });
    } else {
      db.get(countQuery, params.slice(0, -2), (err, countResult) => {
        if (err) {
          return res.status(500).json({ error: '获取搜索结果总数失败' });
        }
        
        res.json({
          results,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.total,
            pages: Math.ceil(countResult.total / limit)
          }
        });
      });
    }
  });
});

// 获取搜索建议
router.get('/suggestions', authenticateToken, (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.json({ suggestions: [] });
  }
  
  const searchTerm = `%${q}%`;
  
  // 获取文件名建议
  const fileQuery = `
    SELECT DISTINCT original_name as name, 'file' as type
    FROM files 
    WHERE user_id = ? AND original_name LIKE ?
    LIMIT 5
  `;
  
  // 获取文件夹名建议
  const folderQuery = `
    SELECT DISTINCT name, 'folder' as type
    FROM folders 
    WHERE user_id = ? AND name LIKE ?
    LIMIT 5
  `;
  
  // 获取标签建议
  const tagQuery = `
    SELECT DISTINCT tag as name, 'tag' as type
    FROM file_tags ft
    JOIN files f ON ft.file_id = f.id
    WHERE f.user_id = ? AND tag LIKE ?
    LIMIT 5
  `;
  
  db.all(fileQuery, [req.user.id, searchTerm], (err, fileSuggestions) => {
    if (err) {
      return res.status(500).json({ error: '获取文件建议失败' });
    }
    
    db.all(folderQuery, [req.user.id, searchTerm], (err, folderSuggestions) => {
      if (err) {
        return res.status(500).json({ error: '获取文件夹建议失败' });
      }
      
      db.all(tagQuery, [req.user.id, searchTerm], (err, tagSuggestions) => {
        if (err) {
          return res.status(500).json({ error: '获取标签建议失败' });
        }
        
        const suggestions = [
          ...fileSuggestions,
          ...folderSuggestions,
          ...tagSuggestions
        ];
        
        res.json({ suggestions });
      });
    });
  });
});

// 获取热门搜索词
router.get('/popular', authenticateToken, (req, res) => {
  const { limit = 10 } = req.query;
  
  // 这里可以实现基于用户搜索历史的统计
  // 暂时返回一些示例数据
  const popularSearches = [
    { term: '文档', count: 15 },
    { term: '图片', count: 12 },
    { term: '视频', count: 8 },
    { term: '工作', count: 6 },
    { term: '项目', count: 5 }
  ];
  
  res.json({ 
    popular: popularSearches.slice(0, parseInt(limit))
  });
});

module.exports = router;
