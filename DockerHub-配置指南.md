# Docker Hub 配置指南

本指南将帮助您在Docker Hub上创建仓库并配置自动构建，以便与GitHub Actions集成。

## 步骤一：创建Docker Hub账户

1. 访问 [Docker Hub](https://hub.docker.com)
2. 注册账户或登录
3. 记录用户名，稍后需要用到

## 步骤二：创建仓库

### 创建后端仓库

1. 点击 "Create Repository"
2. 仓库名称: `wjgl-backend`
3. 描述: `文件管理系统后端服务`
4. 选择 "Public"（如果需要私有仓库，选择"Private"）
5. 点击 "Create"

### 创建前端仓库

1. 点击 "Create Repository"
2. 仓库名称: `wjgl-frontend`
3. 描述: `文件管理系统前端界面`
4. 选择 "Public"（如果需要私有仓库，选择"Private"）
5. 点击 "Create"

## 步骤三：创建访问令牌

为了让GitHub Actions能够推送镜像到Docker Hub，您需要创建访问令牌：

1. 登录Docker Hub
2. 点击右上角头像 → "Account Settings"
3. 左侧菜单选择 "Security" → "New Access Token"
4. 令牌名称: `github-actions`
5. 权限: "Read, Write, Delete"
6. 点击 "Generate"
7. **重要**: 复制并保存令牌，稍后需要用到

## 步骤四：配置GitHub Secrets

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

## 步骤五：验证配置

配置完成后，您可以通过以下方式验证：

1. 在GitHub仓库中推送代码到main分支
2. 在GitHub仓库页面，点击 "Actions" 标签
3. 查看 "Build and Push Docker Images" 工作流
4. 等待构建完成（通常需要5-10分钟）
5. 登录Docker Hub，检查您的仓库是否有新的镜像

## 常见问题

### 1. 推送失败

如果推送失败，请检查：

- Docker Hub用户名和访问令牌是否正确
- GitHub Secrets是否正确配置
- 仓库权限是否正确

### 2. 镜像构建失败

如果镜像构建失败，请检查：

- Dockerfile语法是否正确
- 依赖是否正确安装
- 构建上下文是否正确

### 3. 无法看到新镜像

如果在Docker Hub上看不到新镜像，请检查：

- GitHub Actions工作流是否成功完成
- Docker Hub仓库是否正确创建
- 是否有足够的权限