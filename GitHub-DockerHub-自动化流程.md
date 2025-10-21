# GitHub + Docker Hub 自动化流程指南

本文档提供了将项目自动同步到GitHub并自动构建Docker Hub镜像的完整指南。

## 一、自动化流程概述

整个自动化流程包括以下步骤：

1. 将代码推送到GitHub仓库
2. GitHub Actions自动构建Docker镜像
3. 自动推送镜像到Docker Hub
4. 从Docker Hub部署到目标环境

## 二、准备工作

### 1. GitHub账户和仓库

- 注册GitHub账户：[https://github.com](https://github.com)
- 创建新仓库或使用现有仓库

### 2. Docker Hub账户和仓库

- 注册Docker Hub账户：[https://hub.docker.com](https://hub.docker.com)
- 创建两个仓库：
  - `wjgl-backend`：后端镜像
  - `wjgl-frontend`：前端镜像

### 3. 创建Docker Hub访问令牌

1. 登录Docker Hub
2. 点击右上角头像 → "Account Settings"
3. 左侧菜单选择 "Security" → "New Access Token"
4. 令牌名称: `github-actions`
5. 权限: "Read, Write, Delete"
6. 点击 "Generate"
7. **重要**: 复制并保存令牌，稍后需要用到

## 三、上传到GitHub

### 在Linux/macOS上

```bash
# 进入项目目录
cd 文件管理

# 运行上传脚本
chmod +x upload-to-github.sh
./upload-to-github.sh
```

### 在Windows上

```batch
REM 进入项目目录
cd 文件管理

REM 运行上传脚本
upload-to-github.bat
```

## 四、配置GitHub Secrets

1. 在GitHub仓库页面，点击 "Settings"
2. 左侧菜单选择 "Secrets and variables" → "Actions"
3. 点击 "New repository secret"
4. 添加以下secrets：

```
Name: DOCKER_USERNAME
Value: 你的Docker Hub用户名

Name: DOCKER_PASSWORD  
Value: 你的Docker Hub访问令牌（不是密码）
```

## 五、验证自动构建

1. 在GitHub仓库页面，点击 "Actions" 标签
2. 查看 "Build and Push Docker Images" 工作流
3. 等待构建完成（通常需要5-10分钟）
4. 登录Docker Hub，检查您的仓库是否有新的镜像

## 六、从Docker Hub部署

### 在Linux/macOS上

```bash
# 进入项目目录
cd 文件管理

# 运行部署脚本
chmod +x deploy-from-hub.sh
./deploy-from-hub.sh
```

### 在Windows上

```batch
REM 进入项目目录
cd 文件管理

REM 运行部署脚本
deploy-from-hub.bat
```

## 七、测试自动化流程

### 在Linux/macOS上

```bash
# 进入项目目录
cd 文件管理

# 运行测试脚本
chmod +x test-automation.sh
./test-automation.sh
```

### 在Windows上

```batch
REM 进入项目目录
cd 文件管理

REM 运行测试脚本
test-automation.bat
```

## 八、常见问题

### 1. GitHub Actions失败

检查以下项目：

- Docker Hub用户名和密码是否正确
- 仓库权限是否正确
- 网络连接是否正常

### 2. 镜像构建失败

检查以下项目：

- Dockerfile语法是否正确
- 依赖是否正确安装
- 构建上下文是否正确

### 3. 部署失败

检查以下项目：

- Docker Hub镜像是否存在
- 网络连接是否正常
- 端口是否被占用

## 九、维护和更新

### 1. 更新代码

```bash
# 修改代码后
git add .
git commit -m "Update: 描述修改内容"
git push origin main
```

### 2. 创建版本标签

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

### 3. 更新镜像

```bash
# 在部署服务器上
docker-compose -f docker-compose.hub.yml pull
docker-compose -f docker-compose.hub.yml up -d
```

## 十、总结

通过以上步骤，您已经完成了：

1. ✅ GitHub仓库创建和代码推送
2. ✅ Docker Hub仓库创建和配置
3. ✅ GitHub Actions自动构建配置
4. ✅ Docker Hub镜像自动推送
5. ✅ 从Docker Hub部署

现在您的文件管理系统已经可以通过Docker Hub进行部署，并且支持自动更新。每次推送代码到GitHub仓库时，都会自动构建新的Docker镜像并推送到Docker Hub。