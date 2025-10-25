# wjgl 文件管理系统

[![Docker Build](https://github.com/wsndy666/wjgl/workflows/Docker%20Build/badge.svg)](https://github.com/wsndy666/wjgl/actions)
[![Docker Hub](https://img.shields.io/docker/pulls/wsndy666/wjgl-backend)](https://hub.docker.com/r/wsndy666/wjgl-backend)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

一个基于Docker的文件管理系统，专为飞牛NAS、群晖等NAS系统设计，支持文件上传、下载、管理等功能。

## ✨ 特性

- 🐳 **Docker容器化** - 基于Docker部署，支持多种NAS系统
- 🚀 **自动构建** - GitHub Actions自动构建并推送到Docker Hub
- 🏠 **NAS优化** - 专为飞牛NAS、群晖等系统优化
- 🔧 **一键部署** - 支持一键部署和更新
- 📱 **现代界面** - 基于React的现代化Web界面
- 🔐 **用户管理** - 支持多用户和权限管理
- 📁 **文件管理** - 完整的文件上传、下载、删除功能
- 🔍 **搜索功能** - 支持文件名和内容搜索

## 🚀 快速开始

### 方式一：一键部署（推荐）

#### Linux/Mac用户：
```bash
# 下载并运行快速部署脚本
curl -fsSL https://raw.githubusercontent.com/wsndy666/wjgl/main/quick-deploy.sh | bash
```

#### Windows用户：
```cmd
# 下载并运行快速部署脚本
curl -o quick-deploy.bat https://raw.githubusercontent.com/wsndy666/wjgl/main/quick-deploy.bat
quick-deploy.bat
```

### 方式二：手动部署

```bash
# 1. 克隆项目
git clone https://github.com/wsndy666/wjgl.git
cd wjgl

# 2. 运行部署脚本
chmod +x deploy-from-hub.sh
./deploy-from-hub.sh
```

## 📦 Docker Hub镜像

项目提供以下Docker Hub镜像：

- **后端服务**: `wsndy666/wjgl-backend:latest`
- **前端界面**: `wsndy666/wjgl-frontend:latest`

### 拉取镜像

```bash
# 拉取后端镜像
docker pull wsndy666/wjgl-backend:latest

# 拉取前端镜像
docker pull wsndy666/wjgl-frontend:latest
```

## 🏠 飞牛NAS部署

### 在飞牛NAS上部署

```bash
# 1. 进入飞牛NAS终端
# 2. 下载部署脚本
wget https://raw.githubusercontent.com/wsndy666/wjgl/main/quick-deploy.sh
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### 在飞牛NAS Docker管理界面中查看

部署完成后，在飞牛NAS的Docker管理界面中应该能看到：

- **项目名称**: wjgl
- **容器标签**: com.fn.nas.managed=true
- **容器分类**: wjgl

## 🔧 配置说明

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

## 🌐 访问系统

部署完成后，通过以下地址访问：

- **前端界面**: http://你的NAS IP
- **API接口**: http://你的NAS IP/api
- **健康检查**: http://你的NAS IP/api/health

### 默认账户

- **用户名**: admin
- **密码**: admin123

## 📋 管理命令

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

## 🔄 自动构建

项目配置了GitHub Actions，当代码推送到main分支时会自动：

1. 构建Docker镜像
2. 推送到Docker Hub
3. 生成部署文件

### 配置GitHub Secrets

在GitHub仓库中配置以下Secrets：

- `DOCKER_USERNAME`: 你的Docker Hub用户名
- `DOCKER_PASSWORD`: 你的Docker Hub访问令牌

## 🛠️ 开发

### 本地开发

```bash
# 克隆项目
git clone https://github.com/wsndy666/wjgl.git
cd wjgl

# 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 启动开发服务器
cd backend && npm run dev
cd frontend && npm run dev
```

### 构建镜像

```bash
# 构建后端镜像
docker build -t wsndy666/wjgl-backend:latest ./backend

# 构建前端镜像
docker build -t wsndy666/wjgl-frontend:latest ./frontend
```

## 📚 文档

- [部署指南](wjgl-部署指南.md)
- [飞牛NAS部署指南](飞牛NAS部署指南.md)
- [GitHub Actions配置](.github/workflows/docker-build.yml)

## 🤝 贡献

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如果您遇到问题，请：

1. 查看 [故障排除指南](wjgl-部署指南.md#故障排除)
2. 提交 [Issue](https://github.com/wsndy666/wjgl/issues)
3. 查看 [GitHub Actions](https://github.com/wsndy666/wjgl/actions) 构建状态

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**GitHub**: https://github.com/wsndy666/wjgl  
**Docker Hub**: https://hub.docker.com/r/wsndy666/wjgl-backend