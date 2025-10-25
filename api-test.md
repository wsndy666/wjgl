# API功能测试清单

## 已修复的问题

### ✅ 文件锁定功能
- **问题**: 前端调用 `POST /api/files/:id/lock`，后端实现的是 `PUT /:id/lock`
- **修复**: 将后端路由改为 `POST /:id/lock`
- **参数**: 支持 `isLocked` 和 `is_locked` 两种参数名

### ✅ 批量下载功能
- **问题**: 前端调用 `POST /api/files/download`，后端实现的是 `POST /download/batch`
- **修复**: 将后端路由改为 `POST /download`

## API端点完整性检查

### 认证相关 API
- [x] `POST /api/auth/login` - 用户登录
- [x] `POST /api/auth/register` - 用户注册
- [x] `GET /api/auth/me` - 获取当前用户信息
- [x] `PUT /api/auth/profile` - 更新用户资料
- [x] `POST /api/auth/change-password` - 修改密码

### 文件管理 API
- [x] `GET /api/files` - 获取文件列表
- [x] `POST /api/files/upload` - 上传文件
- [x] `GET /api/files/:id/download` - 下载单个文件
- [x] `POST /api/files/download` - 批量下载文件（ZIP）
- [x] `POST /api/files/:id/lock` - 锁定/解锁文件
- [x] `PUT /api/files/:id` - 更新文件信息
- [x] `DELETE /api/files/:id` - 删除单个文件
- [x] `DELETE /api/files/batch` - 批量删除文件

### 文件夹管理 API
- [x] `GET /api/folders` - 获取文件夹列表
- [x] `GET /api/folders/tree` - 获取文件夹树结构
- [x] `POST /api/folders` - 创建文件夹
- [x] `PUT /api/folders/:id` - 更新文件夹
- [x] `PUT /api/folders/:id/move` - 移动文件夹
- [x] `DELETE /api/folders/:id` - 删除文件夹

### 搜索功能 API
- [x] `GET /api/search` - 全局搜索
- [x] `POST /api/search/advanced` - 高级搜索
- [x] `GET /api/search/suggestions` - 搜索建议
- [x] `GET /api/search/popular` - 热门搜索

### 用户管理 API（管理员）
- [x] `GET /api/users` - 获取用户列表
- [x] `POST /api/users` - 创建用户
- [x] `PUT /api/users/:id` - 更新用户
- [x] `DELETE /api/users/:id` - 删除用户
- [x] `POST /api/users/:id/reset-password` - 重置用户密码

### 系统 API
- [x] `GET /api/health` - 健康检查

## 测试步骤

### 1. 重新构建并运行容器
```bash
# 停止现有容器
docker stop wjgl-test
docker rm wjgl-test

# 重新构建镜像
docker build -t wjgl-local .

# 运行新容器
docker run -d --name wjgl-test -p 9999:80 -p 8888:3001 wjgl-local
```

### 2. 查看日志
```bash
# 查看容器日志
docker logs -f wjgl-test
```

### 3. 功能测试
1. **登录测试** - 使用 admin/admin123 登录
2. **文件上传测试** - 上传各种类型的文件
3. **文件锁定测试** - 锁定和解锁文件
4. **文件下载测试** - 单个和批量下载
5. **搜索测试** - 基本搜索和高级搜索
6. **文件夹测试** - 创建、移动、删除文件夹
7. **用户管理测试** - 创建和管理用户（管理员功能）

## 预期结果

所有API调用应该返回正确的状态码和响应，不再出现404或500错误。

## 日志监控

现在所有API请求都会在控制台输出详细日志，包括：
- 请求方法和URL
- 请求头信息
- 请求体内容
- 查询参数
- 错误信息

这将帮助快速定位和解决任何剩余问题。
