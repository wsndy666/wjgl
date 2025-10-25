# 本地测试指南

## 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker (可选，用于容器测试)

## 本地开发测试步骤

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 启动后端服务

```bash
# 在backend目录下
cd backend
npm run dev
```

后端服务将在 http://localhost:3001 启动

### 3. 启动前端服务

```bash
# 在新终端中，在frontend目录下
cd frontend
npm run dev
```

前端服务将在 http://localhost:5173 启动

### 4. 访问应用

- 前端界面: http://localhost:5173
- 后端API: http://localhost:3001/api
- 健康检查: http://localhost:3001/api/health

### 5. 测试功能

1. **用户注册/登录**
   - 访问 http://localhost:5173
   - 注册新用户或使用默认账户 (admin/admin123)

2. **文件管理**
   - 上传文件测试
   - 创建文件夹测试
   - 文件下载测试
   - 文件删除测试

3. **搜索功能**
   - 测试文件搜索
   - 测试高级筛选

4. **用户管理**
   - 测试用户注册
   - 测试权限管理

## Docker本地测试

### 1. 构建镜像

```bash
# 在项目根目录
docker build -t wjgl-local .
```

### 2. 运行容器

```bash
# 运行容器
docker run -d \
  --name wjgl-test \
  -p 9999:80 \
  -p 8888:3001 \
  -v wjgl-data:/app/data \
  wjgl-local
```

### 3. 访问测试

- 前端界面: http://localhost:9999
- 后端API: http://localhost:9999/api

### 4. 查看日志

```bash
# 查看容器日志
docker logs wjgl-test

# 实时查看日志
docker logs -f wjgl-test
```

### 5. 停止测试

```bash
# 停止容器
docker stop wjgl-test

# 删除容器
docker rm wjgl-test
```

## 测试检查清单

- [ ] 用户注册/登录功能正常
- [ ] 文件上传功能正常
- [ ] 文件下载功能正常
- [ ] 文件夹创建/删除功能正常
- [ ] 文件搜索功能正常
- [ ] 用户管理功能正常
- [ ] 响应式设计正常
- [ ] 错误处理正常
- [ ] 性能表现良好

## 常见问题

### 1. 端口冲突
如果端口被占用，可以修改：
- 后端端口：修改 `backend/package.json` 中的 `PORT` 环境变量
- 前端端口：修改 `frontend/vite.config.ts` 中的 `port` 配置

### 2. 数据库问题
- 确保 `backend/data` 目录存在
- 检查数据库文件权限

### 3. 文件上传问题
- 检查 `backend/data/uploads` 目录权限
- 确认文件大小限制设置

## 提交前检查

在提交代码前，请确保：
1. 所有功能测试通过
2. 没有控制台错误
3. 代码格式正确
4. 提交信息清晰
