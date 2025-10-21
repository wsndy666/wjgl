const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const dbDir = path.dirname(dbPath);

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接错误:', err.message);
  } else {
    console.log('数据库连接成功');
  }
});

// 初始化数据库表
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          avatar TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 文件夹表
      db.run(`
        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER DEFAULT NULL,
          path TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES folders (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // 文件表
      db.run(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          original_name TEXT NOT NULL,
          path TEXT NOT NULL,
          size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          folder_id INTEGER DEFAULT NULL,
          user_id INTEGER NOT NULL,
          is_locked BOOLEAN DEFAULT 0,
          description TEXT,
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // 文件标签表
      db.run(`
        CREATE TABLE IF NOT EXISTS file_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id INTEGER NOT NULL,
          tag TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
        )
      `);

      // 操作日志表
      db.run(`
        CREATE TABLE IF NOT EXISTS operation_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id INTEGER NOT NULL,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // 创建索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id)`);

      // 创建默认管理员用户
      const bcrypt = require('bcryptjs');
      const defaultPassword = bcrypt.hashSync('admin123', 10);
      
      db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
        if (!row) {
          db.run(`
            INSERT INTO users (username, email, password, role) 
            VALUES ('admin', 'admin@example.com', ?, 'admin')
          `, [defaultPassword], function(err) {
            if (err) {
              console.error('创建默认管理员用户失败:', err);
            } else {
              console.log('默认管理员用户创建成功 (admin/admin123)');
            }
          });
        }
      });

      console.log('数据库初始化完成');
      resolve();
    });
  });
};

module.exports = { db, initDatabase };
