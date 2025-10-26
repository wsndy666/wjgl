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
      WHERE f.user_id = ? AND (f.name LIKE ? OR f.original_name LIKE ? OR f.description LIKE ?)
    `;
    
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, req.user.id, searchTerm, searchTerm, searchTerm);
    
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
    
    if (type === 'folders') {
      query = folderQuery;
      params = [searchTerm, req.user.id, searchTerm];
      countQuery = 'SELECT COUNT(*) as total FROM folders WHERE user_id = ? AND name LIKE ?';
      countParams = [req.user.id, searchTerm];
    } else {
      // 合并查询 - 需要确保字段匹配
      query = `
        SELECT * FROM (
          ${query}
          UNION ALL
          ${folderQuery}
        ) ORDER BY relevance, created_at DESC
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
            success: true,
            data: {
              files: results.filter(item => !item.file_count), // 文件
              folders: results.filter(item => item.file_count !== undefined), // 文件夹
              total,
              page: parseInt(page),
              limit: parseInt(limit),
              totalPages: Math.ceil(total / limit)
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
router.get('/advanced', authenticateToken, (req, res) => {
  const { 
    query: searchQuery, 
    type = 'all', 
    filters,
    page = 1, 
    limit = 20 
  } = req.query;
  
  console.log('Advanced search params:', { query: searchQuery, type, filters, page, limit });
  
  // Parse filters - Express query parser handles filters[mime_type]=image syntax
  let parsedFilters = {};
  if (filters) {
    // If filters is already an object (parsed by Express from filters[prop]=value), use it directly
    if (typeof filters === 'object' && !Array.isArray(filters)) {
      parsedFilters = filters;
    } else if (typeof filters === 'string') {
      try {
        parsedFilters = JSON.parse(filters);
      } catch (e) {
        // If parsing fails, treat as an empty object
        parsedFilters = {};
      }
    }
  }
  
  console.log('Parsed filters:', parsedFilters);
  
  const offset = (page - 1) * limit;
  
  // 分别处理文件和文件夹搜索
  if (type === 'files' || type === 'all') {
    // 构建文件查询
    let fileWhereConditions = ['f.user_id = ?'];
    let fileParams = [req.user.id];
    
    if (searchQuery && searchQuery.trim()) {
      fileWhereConditions.push('(f.name LIKE ? OR f.original_name LIKE ? OR f.description LIKE ?)');
      const searchTerm = `%${searchQuery}%`;
      fileParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (parsedFilters.mime_type) {
      fileWhereConditions.push('f.mime_type LIKE ?');
      fileParams.push(`%${parsedFilters.mime_type}%`);
    }
    
    if (parsedFilters.size_min) {
      fileWhereConditions.push('f.size >= ?');
      fileParams.push(parseInt(parsedFilters.size_min));
    }
    
    if (parsedFilters.size_max) {
      fileWhereConditions.push('f.size <= ?');
      fileParams.push(parseInt(parsedFilters.size_max));
    }
    
    if (parsedFilters.date_from) {
      fileWhereConditions.push('f.created_at >= ?');
      fileParams.push(parsedFilters.date_from);
    }
    
    if (parsedFilters.date_to) {
      fileWhereConditions.push('f.created_at <= ?');
      fileParams.push(parsedFilters.date_to);
    }
    
    if (parsedFilters.tags && parsedFilters.tags.length > 0) {
      const tagPlaceholders = parsedFilters.tags.map(() => '?').join(',');
      fileWhereConditions.push(`f.id IN (SELECT file_id FROM file_tags WHERE tag IN (${tagPlaceholders}))`);
      fileParams.push(...parsedFilters.tags);
    }
    
    if (parsedFilters.is_locked !== undefined) {
      fileWhereConditions.push('f.is_locked = ?');
      fileParams.push(parsedFilters.is_locked ? 1 : 0);
    }
    
    const fileWhereClause = fileWhereConditions.join(' AND ');
    
    let fileQuery = `
      SELECT f.*, ft.tags
      FROM files f
      LEFT JOIN (
        SELECT file_id, GROUP_CONCAT(tag) as tags 
        FROM file_tags 
        GROUP BY file_id
      ) ft ON f.id = ft.file_id
      WHERE ${fileWhereClause}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    let fileCountQuery = `SELECT COUNT(*) as total FROM files f WHERE ${fileWhereClause}`;
    
    fileParams.push(parseInt(limit), offset);
    
    if (type === 'all') {
      // 处理文件夹查询
      let folderWhereConditions = ['f.user_id = ?'];
      let folderParams = [req.user.id];
      
      if (searchQuery && searchQuery.trim()) {
        folderWhereConditions.push('f.name LIKE ?');
        const searchTerm = `%${searchQuery}%`;
        folderParams.push(searchTerm);
      }
      
      const folderWhereClause = folderWhereConditions.join(' AND ');
      
      let folderQuery = `
        SELECT f.*, 
               (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count,
               (SELECT COUNT(*) FROM folders WHERE parent_id = f.id) as subfolder_count,
               NULL as tags
        FROM folders f
        WHERE ${folderWhereClause}
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      let folderCountQuery = `SELECT COUNT(*) as total FROM folders f WHERE ${folderWhereClause}`;
      folderParams.push(parseInt(limit), offset);
      
      // 执行两个查询
      db.all(fileQuery, fileParams, (err, files) => {
        if (err) {
          console.error('文件搜索查询错误:', err);
          return res.status(500).json({ error: '高级搜索失败' });
        }
        
        db.all(folderQuery, folderParams, (err, folders) => {
          if (err) {
            console.error('文件夹搜索查询错误:', err);
            return res.status(500).json({ error: '高级搜索失败' });
          }
          
          db.get(fileCountQuery, fileParams.slice(0, -2), (err, fileCount) => {
            if (err) {
              return res.status(500).json({ error: '获取搜索结果总数失败' });
            }
            
            db.get(folderCountQuery, folderParams.slice(0, -2), (err, folderCount) => {
              if (err) {
                return res.status(500).json({ error: '获取搜索结果总数失败' });
              }
              
              const total = (fileCount?.total || 0) + (folderCount?.total || 0);
              const results = [...files, ...folders];
              
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
        });
      });
    } else {
      // 仅搜索文件
      db.all(fileQuery, fileParams, (err, results) => {
        if (err) {
          console.error('高级搜索查询错误:', err);
          return res.status(500).json({ error: '高级搜索失败' });
        }
        
        db.get(fileCountQuery, fileParams.slice(0, -2), (err, countResult) => {
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
      });
    }
  } else if (type === 'folders') {
    // 仅搜索文件夹
    let folderWhereConditions = ['f.user_id = ?'];
    let folderParams = [req.user.id];
    
    if (searchQuery && searchQuery.trim()) {
      folderWhereConditions.push('f.name LIKE ?');
      const searchTerm = `%${searchQuery}%`;
      folderParams.push(searchTerm);
    }
    
    const folderWhereClause = folderWhereConditions.join(' AND ');
    
    let folderQuery = `
      SELECT f.*, 
             (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count,
             (SELECT COUNT(*) FROM folders WHERE parent_id = f.id) as subfolder_count,
             NULL as tags
      FROM folders f
      WHERE ${folderWhereClause}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    let folderCountQuery = `SELECT COUNT(*) as total FROM folders f WHERE ${folderWhereClause}`;
    
    folderParams.push(parseInt(limit), offset);
    
    db.all(folderQuery, folderParams, (err, results) => {
      if (err) {
        console.error('高级搜索查询错误:', err);
        return res.status(500).json({ error: '高级搜索失败' });
      }
      
      db.get(folderCountQuery, folderParams.slice(0, -2), (err, countResult) => {
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
    });
  }
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
  
  // 基于实际文件数据统计热门搜索词
  const popularQuery = `
    SELECT 
      CASE 
        WHEN f.mime_type LIKE 'image/%' THEN '图片'
        WHEN f.mime_type LIKE 'video/%' THEN '视频'
        WHEN f.mime_type LIKE 'audio/%' THEN '音频'
        WHEN f.mime_type LIKE '%pdf%' THEN 'PDF'
        WHEN f.mime_type LIKE '%word%' THEN 'Word'
        WHEN f.mime_type LIKE '%excel%' THEN 'Excel'
        WHEN f.mime_type LIKE '%powerpoint%' THEN 'PowerPoint'
        ELSE '文档'
      END as term,
      COUNT(*) as count
    FROM files f
    WHERE f.user_id = ?
    GROUP BY term
    ORDER BY count DESC
    LIMIT ?
  `;
  
  db.all(popularQuery, [req.user.id, parseInt(limit)], (err, results) => {
    if (err) {
      console.error('获取热门搜索词失败:', err);
      return res.status(500).json({ error: '获取热门搜索词失败' });
    }
    
    // 如果没有结果，返回默认数据
    if (!results || results.length === 0) {
      const defaultSearches = [
        { term: '文档', count: 0 },
        { term: '图片', count: 0 },
        { term: '视频', count: 0 },
        { term: '音频', count: 0 },
        { term: 'PDF', count: 0 }
      ];
      return res.json({ popular: defaultSearches.slice(0, parseInt(limit)) });
    }
    
    res.json({ 
      popular: results
    });
  });
});

module.exports = router;
