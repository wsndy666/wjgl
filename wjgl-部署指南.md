# wjgl 文件管理系统部署指南

## 项目概述

wjgl 是一个基于Docker的文件管理系统，支持飞牛NAS、群晖等系统，具有以下特性：

- 🐳 基于Docker容器化部署
- 🚀 支持GitHub Actions自动构建
- 📦 自动同步到Docker Hub
- 🏠 专为NAS系统优化
- 🔧 支持一键部署

## 快速开始

### 1. 上传到GitHub

```bash
# 运行上传脚本
chmod +x upload-to-github.sh
./upload-to-github.sh
```

### 2. 配置Docker Hub

#### 2.1 创建Docker Hub仓库

在Docker Hub创建以下仓库：
- `wjgl-backend`
- `wjgl-frontend`

#### 2.2 获取访问令牌

1. 登录 [Docker Hub](https://hub.docker.com)
2. 点击右上角头像 → "Account Settings"
3. 选择 "Security" → "New Access Token"
4. 令牌名称: `github-actions`
5. 权限: "Read, Write, Delete"
6. 点击 "Generate" 并保存令牌

### 3. 配置GitHub Secrets

在GitHub仓库 `wjgl` 中配置：

1. 进入仓库 Settings → Secrets and variables → Actions
2. 添加以下Secrets：

```
DOCKER_USERNAME: 你的Docker Hub用户名
DOCKER_PASSWORD: 你的Docker Hub访问令牌
```

### 4. 验证自动构建

推送代码后，GitHub Actions会自动：

1. 构建Docker镜像
2. 推送到Docker Hub
3. 生成部署文件

## 部署方式

### 方式一：使用Docker Hub镜像（推荐）

```bash
# 1. 下载部署脚本
wget https://raw.githubusercontent.com/wsndy666/wjgl/main/deploy-from-hub.sh

# 2. 运行部署
chmod +x deploy-from-hub.sh
./deploy-from-hub.sh
```

### 方式二：本地构建

```bash
# 1. 下载项目
git clone https://github.com/wsndy666/wjgl.git
cd wjgl

# 2. 运行安装脚本
chmod +x install-fixed.sh
./install-fixed.sh
```

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

- **前端界面**: http://你的NAS IP
- **API接口**: http://你的NAS IP/api
- **健康检查**: http://你的NAS IP/api/health

### 默认账户

- **用户名**: admin
- **密码**: admin123

## 管理命令

### 使用Docker Hub镜像

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

### 使用本地构建

```bash
# 查看服务状态
docker-compose -f docker-compose-local.yml ps

# 查看日志
docker-compose -f docker-compose-local.yml logs -f

# 重启服务
docker-compose -f docker-compose-local.yml restart

# 停止服务
docker-compose -f docker-compose-local.yml down
```

## 飞牛NAS特殊配置

### 在Docker管理界面中查看

部署完成后，在飞牛NAS的Docker管理界面中应该能看到：

- **项目名称**: file-management
- **容器标签**: com.fn.nas.managed=true
- **容器分类**: file-management

### 端口映射

在飞牛NAS的Docker应用中，需要配置以下端口映射：
- 80 → 80 (HTTP)
- 443 → 443 (HTTPS，可选)

### 数据持久化

确保以下目录映射到飞牛NAS的存储卷：
- `./data` → `/vol2/docker/wjgl/data`
- `./logs` → `/vol2/docker/wjgl/logs`

## 故障排除

### 1. Docker镜像拉取失败

```bash
# 配置Docker镜像源
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF

# 重启Docker
sudo systemctl restart docker
```

### 2. 服务启动失败

```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :3001
```

### 3. 文件上传失败

```bash
# 检查目录权限
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

## 更新日志

### v1.0.0
- 初始版本发布
- 支持飞牛NAS部署
- 配置GitHub Actions自动构建
- 支持Docker Hub自动同步

---

更多帮助请参考项目README.md文件。
