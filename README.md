# wjgl 文件管理系统

[![Docker Build](https://github.com/wsndy666/wjgl/workflows/Docker%20Build/badge.svg)](https://github.com/wsndy666/wjgl/actions)
[![Docker Hub](https://img.shields.io/docker/pulls/wsndy666/wjgl-backend)](https://hub.docker.com/r/wsndy666/wjgl-backend)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

一个基于Docker的文件管理系统，专为飞牛NAS、群晖等NAS系统设计，支持文件上传、下载、管理等功能。

## ✨ 核心功能

### 🐳 **容器化部署**
- **Docker容器化** - 基于Docker部署，支持多种NAS系统
- **自动构建** - GitHub Actions自动构建并推送到Docker Hub
- **NAS优化** - 专为飞牛NAS、群晖等系统优化
- **一键部署** - 支持一键部署和更新

### 📁 **文件管理系统**
- **文件上传** - 支持大文件上传（最大10GB），拖拽上传，批量上传
- **文件下载** - 单文件下载，批量下载，ZIP压缩包下载
- **文件管理** - 重命名、移动、复制、删除文件
- **文件夹管理** - 创建、删除、重命名文件夹，支持嵌套文件夹结构
- **文件预览** - 支持图片、文档、视频等多种格式预览
- **文件锁定** - 文件锁定/解锁功能，防止误操作
- **文件标签** - 为文件添加标签，便于分类管理
- **文件描述** - 为文件添加详细描述信息

### 🔍 **智能搜索**
- **全文搜索** - 支持文件名、描述、标签的全文搜索
- **高级筛选** - 按文件类型、大小、创建时间、标签等条件筛选
- **搜索历史** - 保存搜索历史，快速重复搜索
- **模糊搜索** - 支持模糊匹配和智能提示

### 👥 **用户权限管理**
- **多用户支持** - 支持多用户注册和登录
- **权限控制** - 基于JWT的身份验证和授权
- **用户管理** - 管理员可以管理所有用户
- **操作日志** - 记录所有用户操作，便于审计

### 🎨 **现代化界面**
- **React前端** - 基于React 18 + TypeScript的现代化界面
- **Ant Design** - 使用Ant Design组件库，界面美观易用
- **响应式设计** - 支持桌面端和移动端访问
- **暗色主题** - 支持明暗主题切换
- **实时更新** - 基于React Query的实时数据更新

### 🔧 **技术特性**
- **Node.js后端** - 基于Express.js的高性能后端服务
- **SQLite数据库** - 轻量级数据库，无需额外配置
- **Nginx代理** - 前端静态文件服务和API代理
- **RESTful API** - 完整的RESTful API接口
- **文件存储** - 本地文件存储，支持大文件处理
- **安全防护** - 文件类型验证、大小限制、路径安全

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

## 📦 Docker镜像

### 统一镜像（推荐）
项目提供统一的Docker镜像，包含前端和后端服务：

- **主镜像**: `wsndy666/wjgl:latest`
- **多架构支持**: linux/amd64, linux/arm64
- **自动构建**: 每次代码推送自动构建最新镜像

### 拉取镜像

```bash
# 拉取最新镜像
docker pull wsndy666/wjgl:latest

# 查看镜像信息
docker inspect wsndy666/wjgl:latest
```

### 镜像特性
- **多阶段构建** - 优化镜像大小，提高构建效率
- **Nginx + Node.js** - 前端静态文件服务 + 后端API服务
- **健康检查** - 内置健康检查机制
- **数据持久化** - 支持数据卷挂载

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

## 🏗️ 技术架构

### 系统架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户浏览器     │    │   Nginx代理     │    │   Node.js后端   │
│                 │    │                 │    │                 │
│  React前端界面   │◄──►│  静态文件服务   │◄──►│   Express API   │
│  Ant Design UI  │    │  API代理转发    │    │   SQLite数据库  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   文件存储系统   │
                       │                 │
                       │  本地文件系统   │
                       │  用户目录隔离   │
                       └─────────────────┘
```

### 技术栈
- **前端**: React 18 + TypeScript + Ant Design + React Query
- **后端**: Node.js + Express.js + SQLite3
- **代理**: Nginx
- **容器**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **数据库**: SQLite（轻量级，无需额外配置）

### 核心模块
- **文件管理模块** - 文件上传、下载、删除、重命名等操作
- **文件夹管理模块** - 文件夹创建、删除、移动等操作
- **搜索模块** - 全文搜索、高级筛选、搜索历史
- **用户管理模块** - 用户注册、登录、权限管理
- **标签系统** - 文件标签管理、分类筛选
- **操作日志** - 用户操作记录、审计追踪

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

### 访问地址
部署完成后，通过以下地址访问：

- **前端界面**: http://你的NAS IP:9999
- **API接口**: http://你的NAS IP:9999/api
- **健康检查**: http://你的NAS IP:9999/api/health

### 默认账户
- **用户名**: admin
- **密码**: admin123

### 主要功能页面
- **文件管理** - 文件上传、下载、管理、预览
- **搜索中心** - 智能搜索、高级筛选
- **用户管理** - 用户注册、权限管理（管理员）
- **系统设置** - 个人设置、系统配置
- **仪表板** - 系统概览、使用统计

### 支持的文件类型
- **图片**: JPG, PNG, GIF, WebP, SVG
- **文档**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **视频**: MP4, AVI, MOV, WMV, FLV
- **音频**: MP3, WAV, FLAC, AAC
- **压缩包**: ZIP, RAR, 7Z, TAR, GZ
- **其他**: TXT, JSON, XML, CSV等文本文件

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