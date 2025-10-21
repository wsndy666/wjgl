# GitHub Actions 自动化配置

本目录包含GitHub Actions工作流配置，用于自动构建和推送Docker镜像到Docker Hub。

## 工作流说明

`docker-build-push.yml` 工作流会在以下情况触发：

1. 推送代码到 `main` 分支
2. 创建版本标签（格式为 `v*`，例如 `v1.0.0`）
3. 创建针对 `main` 分支的Pull Request

## 工作流功能

工作流会执行以下操作：

1. 检出代码
2. 设置Docker Buildx
3. 登录到Docker Hub
4. 提取元数据（标签、标签）
5. 构建并推送后端镜像
6. 构建并推送前端镜像
7. 如果是版本标签，则构建并推送带版本号的镜像

## 所需的Secrets

工作流需要以下GitHub Secrets：

- `DOCKER_USERNAME`: Docker Hub用户名
- `DOCKER_PASSWORD`: Docker Hub访问令牌（不是密码）

## 如何配置Secrets

1. 在GitHub仓库页面，点击 "Settings"
2. 左侧菜单选择 "Secrets and variables" → "Actions"
3. 点击 "New repository secret"
4. 添加上述Secrets

## 如何使用

无需手动操作，工作流会在推送代码或创建标签时自动触发。

如果需要手动触发，可以在GitHub仓库页面的"Actions"标签中找到工作流，点击"Run workflow"按钮。