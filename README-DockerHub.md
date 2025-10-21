# 文件管理系统 - Docker Hub 部署指南

## 概述

这是一个基于Docker的文件管理系统，支持从Docker Hub直接部署，特别适用于飞牛NAS、群晖NAS等系统。

## 快速部署

### 方法一：使用部署脚本（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-username/file-management.git
cd file-management

# 2. 运行部署脚本
chmod +x deploy-from-hub.sh
./deploy-from-hub.sh
```

### 方法二：手动部署

```bash
# 1. 设置Docker Hub用户名
export DOCKER_HUB_USERNAME=your-username

# 2. 更新docker-compose.hub.yml中的镜像名称
sed -i "s/your-dockerhub-username/$DOCKER_HUB_USERNAME/g" docker-compose.hub.yml

# 3. 创建必要目录
mkdir -p data/uploads logs ssl

# 4. 配置环境变量
cp env.example .env

# 5. 启动服务
docker-compose -f docker-compose.hub.yml up -d
```

## Docker Hub 镜像

### 镜像列表

- **后端服务**: `your-username/file-management-backend:latest`
- **前端界面**: `your-username/file-management-frontend:latest`

### 自动构建

项目配置了GitHub Actions，当代码推送到main分支时会自动构建并推送到Docker Hub。

## 配置说明

### 环境变量

创建 `.env` 文件：

```env
# 应用配置
NODE_ENV=production
PORT=3001

# 数据库配置
DB_PATH=./data/database.sqlite

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this

# 文件上传配置
UPLOAD_PATH=./data/uploads
MAX_FILE_SIZE=10737418240

# 前端URL
FRONTEND_URL=http://localhost
```

### 端口配置

- **前端**: 80 (HTTP)
- **后端**: 3001
- **Nginx**: 80, 443

## 访问系统

部署完成后，通过以下地址访问：

- **前端界面**: http://your-nas-ip
- **API接口**: http://your-nas-ip/api
- **健康检查**: http://your-nas-ip/api/health

## 默认账户

- **用户名**: admin
- **密码**: admin123

## 管理命令

```bash
# 查看服务状态
docker-compose -f docker-compose.hub.yml ps

# 查看日志
docker-compose -f docker-compose.hub.yml logs -f

# 重启服务
docker-compose -f docker-compose.hub.yml restart

# 停止服务
docker-compose -f docker-compose.hub.yml down

# 更新服务
docker-compose -f docker-compose.hub.yml pull
docker-compose -f docker-compose.hub.yml up -d
```

## 飞牛NAS特殊配置

### 在飞牛NAS Docker管理界面中查看

1. 容器标签包含 `com.fn.nas.managed=true`
2. 项目名称: `file-management`
3. 容器分类: `file-management`

### 端口映射

在飞牛NAS的Docker应用中，需要配置以下端口映射：
- 80 → 80 (HTTP)
- 443 → 443 (HTTPS，可选)

### 数据持久化

确保以下目录映射到飞牛NAS的存储卷：
- `./data` → `/vol2/docker/文件管理/data`
- `./logs` → `/vol2/docker/文件管理/logs`

## 故障排除

### 1. 服务启动失败

```bash
# 查看详细日志
docker-compose -f docker-compose.hub.yml logs

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :3001
```

### 2. 镜像拉取失败

```bash
# 检查网络连接
ping docker.io

# 手动拉取镜像
docker pull your-username/file-management-backend:latest
docker pull your-username/file-management-frontend:latest
```

### 3. 文件上传失败

检查目录权限：

```bash
chmod 755 data/uploads
chown -R 1000:1000 data/uploads
```

## 备份与恢复

### 备份数据

```bash
# 备份数据库
cp data/database.sqlite backup/database-$(date +%Y%m%d).sqlite

# 备份上传文件
tar -czf backup/uploads-$(date +%Y%m%d).tar.gz data/uploads
```

### 恢复数据

```bash
# 恢复数据库
cp backup/database-YYYYMMDD.sqlite data/database.sqlite

# 恢复上传文件
tar -xzf backup/uploads-YYYYMMDD.tar.gz -C data/
```

## 性能优化

### 1. 资源限制

- 建议分配至少2GB内存
- 确保有足够的存储空间（建议10GB以上）

### 2. 网络优化

- 使用有线网络连接
- 确保网络稳定

## 安全建议

1. **修改默认密码**：首次登录后立即修改admin密码
2. **定期备份**：设置自动备份任务
3. **更新系统**：定期更新Docker镜像
4. **监控日志**：定期检查系统日志

## 技术支持

如遇到问题，请检查：

1. Docker和Docker Compose是否正确安装
2. 网络连接是否正常
3. 存储空间是否充足
4. 端口是否被占用

更多帮助请参考项目README.md文件。
