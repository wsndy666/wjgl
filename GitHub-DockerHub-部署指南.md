# GitHub + Docker Hub 部署完整指南

## 步骤一：准备GitHub仓库

### 1. 创建GitHub仓库

1. 登录 [GitHub](https://github.com)
2. 点击 "New repository"
3. 仓库名称: `file-management`
4. 描述: `基于Docker的文件管理系统，支持飞牛NAS等系统`
5. 选择 "Public" 或 "Private"
6. 不要勾选 "Initialize this repository with a README"
7. 点击 "Create repository"

### 2. 初始化本地Git仓库

```bash
# 在项目目录中执行
git init
git add .
git commit -m "Initial commit: 文件管理系统"

# 添加远程仓库
git remote add origin https://github.com/your-username/file-management.git

# 推送到GitHub
git branch -M main
git push -u origin main
```

## 步骤二：配置Docker Hub

### 1. 创建Docker Hub账户

1. 访问 [Docker Hub](https://hub.docker.com)
2. 注册账户或登录
3. 记录用户名，稍后需要用到

### 2. 创建仓库

1. 点击 "Create Repository"
2. 仓库名称: `file-management-backend`
3. 描述: `文件管理系统后端服务`
4. 选择 "Public"
5. 点击 "Create"

重复上述步骤创建 `file-management-frontend` 仓库。

## 步骤三：配置GitHub Secrets

### 1. 获取Docker Hub访问令牌

1. 登录Docker Hub
2. 点击右上角头像 → "Account Settings"
3. 左侧菜单选择 "Security" → "New Access Token"
4. 令牌名称: `github-actions`
5. 权限: "Read, Write, Delete"
6. 点击 "Generate"
7. **重要**: 复制并保存令牌，稍后需要用到

### 2. 配置GitHub Secrets

1. 在GitHub仓库页面，点击 "Settings"
2. 左侧菜单选择 "Secrets and variables" → "Actions"
3. 点击 "New repository secret"
4. 添加以下secrets：

```
Name: DOCKER_USERNAME
Value: 你的Docker Hub用户名

Name: DOCKER_PASSWORD  
Value: 你的Docker Hub访问令牌
```

## 步骤四：推送代码触发自动构建

### 1. 更新docker-compose.hub.yml

将文件中的 `your-dockerhub-username` 替换为你的Docker Hub用户名：

```bash
# 替换用户名
sed -i "s/your-dockerhub-username/你的Docker Hub用户名/g" docker-compose.hub.yml
```

### 2. 提交并推送

```bash
git add .
git commit -m "Add Docker Hub deployment configuration"
git push origin main
```

### 3. 验证自动构建

1. 在GitHub仓库页面，点击 "Actions" 标签
2. 查看 "Build and Push Docker Images" 工作流
3. 等待构建完成（通常需要5-10分钟）

## 步骤五：测试Docker Hub镜像

### 1. 拉取镜像测试

```bash
# 拉取后端镜像
docker pull 你的用户名/file-management-backend:latest

# 拉取前端镜像  
docker pull 你的用户名/file-management-frontend:latest
```

### 2. 使用Docker Hub镜像部署

```bash
# 运行部署脚本
chmod +x deploy-from-hub.sh
./deploy-from-hub.sh
```

## 步骤六：飞牛NAS部署

### 1. 在飞牛NAS上部署

```bash
# 1. 下载部署脚本
wget https://raw.githubusercontent.com/你的用户名/file-management/main/deploy-from-hub.sh

# 2. 运行部署
chmod +x deploy-from-hub.sh
./deploy-from-hub.sh
```

### 2. 在飞牛NAS Docker管理界面中查看

部署完成后，在飞牛NAS的Docker管理界面中应该能看到：

- **项目名称**: file-management
- **容器标签**: com.fn.nas.managed=true
- **容器分类**: file-management

## 步骤七：持续集成配置

### 1. 自动更新配置

每次推送代码到main分支时，GitHub Actions会：

1. 自动构建新的Docker镜像
2. 推送到Docker Hub
3. 生成部署文件

### 2. 版本标签

创建版本标签触发发布：

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

这会在Docker Hub中创建带版本标签的镜像。

## 故障排除

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

### 3. 飞牛NAS部署失败

检查以下项目：

- Docker Hub镜像是否存在
- 网络连接是否正常
- 端口是否被占用

## 维护和更新

### 1. 更新代码

```bash
# 修改代码后
git add .
git commit -m "Update: 描述修改内容"
git push origin main
```

### 2. 更新镜像

```bash
# 在部署服务器上
docker-compose -f docker-compose.hub.yml pull
docker-compose -f docker-compose.hub.yml up -d
```

### 3. 监控部署

```bash
# 查看服务状态
docker-compose -f docker-compose.hub.yml ps

# 查看日志
docker-compose -f docker-compose.hub.yml logs -f
```

## 总结

通过以上步骤，您已经完成了：

1. ✅ GitHub仓库创建和代码推送
2. ✅ Docker Hub仓库创建和配置
3. ✅ GitHub Actions自动构建配置
4. ✅ Docker Hub镜像自动推送
5. ✅ 飞牛NAS部署配置

现在您的文件管理系统已经可以通过Docker Hub进行部署，并且支持自动更新。
