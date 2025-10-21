@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 上传项目到GitHub仓库 wjgl
REM 并配置Docker Hub自动同步

echo 上传项目到GitHub仓库 wjgl
echo ==========================
echo.

REM 检查Git
echo [INFO] 检查Git环境...
REM 使用完整路径尝试检测Git
set GIT_PATH=C:\Program Files\Git\bin\git.exe
if exist "%GIT_PATH%" (
    echo [INFO] 找到Git: %GIT_PATH%
    set GIT_CMD="%GIT_PATH%"
) else (
    REM 尝试使用PATH中的git
    git --version >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] 使用系统PATH中的Git
        set GIT_CMD=git
    ) else (
        echo [ERROR] Git 未安装或未在PATH中，请先安装 Git
        pause
        exit /b 1
    )
)

REM 检查Git配置
%GIT_CMD% config --global user.name >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Git用户名未配置
    set /p git_username="请输入Git用户名: "
    %GIT_CMD% config --global user.name "!git_username!"
)

%GIT_CMD% config --global user.email >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Git邮箱未配置
    set /p git_email="请输入Git邮箱: "
    %GIT_CMD% config --global user.email "!git_email!"
)

echo [SUCCESS] Git环境检查通过

REM 初始化Git仓库
echo [INFO] 初始化Git仓库...
if exist ".git" (
    echo [INFO] Git仓库已存在
) else (
    %GIT_CMD% init
    echo [SUCCESS] Git仓库初始化完成
)

REM 创建.github目录和工作流配置
echo [INFO] 创建GitHub Actions工作流配置...
if not exist ".github\workflows" mkdir ".github\workflows"

REM 创建GitHub Actions工作流配置文件
(
echo name: Build and Push Docker Images
echo.
echo on:
echo   push:
echo     branches: [ main ]
echo     tags: [ 'v*' ]
echo   pull_request:
echo     branches: [ main ]
echo.
echo jobs:
echo   build-and-push:
echo     runs-on: ubuntu-latest
echo     
echo     steps:
echo       - name: Checkout code
echo         uses: actions/checkout@v3
echo       
echo       - name: Set up Docker Buildx
echo         uses: docker/setup-buildx-action@v2
echo       
echo       - name: Login to DockerHub
echo         uses: docker/login-action@v2
echo         with:
echo           username: ${{ secrets.DOCKER_USERNAME }}
echo           password: ${{ secrets.DOCKER_PASSWORD }}
echo       
echo       - name: Extract metadata ^(tags, labels^) for Docker
echo         id: meta
echo         uses: docker/metadata-action@v4
echo         with:
echo           images: ^|
echo             ${{ secrets.DOCKER_USERNAME }}/wjgl-backend
echo             ${{ secrets.DOCKER_USERNAME }}/wjgl-frontend
echo       
echo       - name: Build and push backend image
echo         uses: docker/build-push-action@v4
echo         with:
echo           context: ./backend
echo           push: ${{ github.event_name != 'pull_request' }}
echo           tags: ${{ secrets.DOCKER_USERNAME }}/wjgl-backend:latest
echo           labels: ${{ steps.meta.outputs.labels }}
echo           cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/wjgl-backend:buildcache
echo           cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/wjgl-backend:buildcache,mode=max
echo       
echo       - name: Build and push frontend image
echo         uses: docker/build-push-action@v4
echo         with:
echo           context: ./frontend
echo           push: ${{ github.event_name != 'pull_request' }}
echo           tags: ${{ secrets.DOCKER_USERNAME }}/wjgl-frontend:latest
echo           labels: ${{ steps.meta.outputs.labels }}
echo           cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/wjgl-frontend:buildcache
echo           cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/wjgl-frontend:buildcache,mode=max
echo       
echo       - name: Build and push version tag ^(if tagged^)
echo         if: startsWith^(github.ref, 'refs/tags/'^)
echo         run: ^|
echo           VERSION=${GITHUB_REF#refs/tags/}
echo           echo "Building version: $VERSION"
echo           
echo           # 构建并推送后端版本镜像
echo           docker buildx build --push \
echo             --tag ${{ secrets.DOCKER_USERNAME }}/wjgl-backend:${VERSION} \
echo             --cache-from ${{ secrets.DOCKER_USERNAME }}/wjgl-backend:buildcache \
echo             ./backend
echo           
echo           # 构建并推送前端版本镜像
echo           docker buildx build --push \
echo             --tag ${{ secrets.DOCKER_USERNAME }}/wjgl-frontend:${VERSION} \
echo             --cache-from ${{ secrets.DOCKER_USERNAME }}/wjgl-frontend:buildcache \
echo             ./frontend
echo       
echo       - name: Update deployment status
echo         run: ^|
echo           echo "::set-output name=status::success"
echo           echo "Docker images built and pushed successfully!"
echo           echo "Backend: ${{ secrets.DOCKER_USERNAME }}/wjgl-backend:latest"
echo           echo "Frontend: ${{ secrets.DOCKER_USERNAME }}/wjgl-frontend:latest"
) > .github\workflows\docker-build-push.yml

echo [SUCCESS] GitHub Actions工作流配置创建完成

REM 创建.gitignore文件
echo [INFO] 创建.gitignore文件...
(
echo # 依赖文件
echo node_modules/
echo npm-debug.log*
echo yarn-debug.log*
echo yarn-error.log*
echo.
echo # 环境变量
echo .env
echo .env.local
echo .env.development.local
echo .env.test.local
echo .env.production.local
echo.
echo # 数据文件
echo data/
echo logs/
echo *.log
echo.
echo # 临时文件
echo .DS_Store
echo Thumbs.db
echo *.tmp
echo *.temp
echo.
echo # IDE文件
echo .vscode/
echo .idea/
echo *.swp
echo *.swo
echo.
echo # Docker相关
echo .dockerignore
echo.
echo # 备份文件
echo *.backup
echo *.bak
echo.
echo # SSL证书
echo ssl/
echo *.pem
echo *.key
echo *.crt
echo.
echo # 监控数据
echo monitoring/prometheus_data/
echo monitoring/grafana_data/
) > .gitignore

echo [SUCCESS] .gitignore文件创建完成

REM 添加文件到Git
echo [INFO] 添加文件到Git...
%GIT_CMD% add .

REM 检查是否有文件需要提交
%GIT_CMD% diff --cached --quiet
if errorlevel 1 (
    echo [SUCCESS] 文件添加完成
) else (
    echo [WARNING] 没有文件需要提交
    goto :show_next_steps
)

REM 提交代码
echo [INFO] 提交代码...
%GIT_CMD% commit -m "Initial commit: 文件管理系统 wjgl

- 基于Docker的文件管理系统
- 支持飞牛NAS、群晖等系统
- 包含前端、后端、Nginx服务
- 支持Docker Hub自动构建
- 配置GitHub Actions CI/CD"

echo [SUCCESS] 代码提交完成

REM 添加远程仓库
echo [INFO] 配置远程仓库...
%GIT_CMD% remote get-url origin >nul 2>&1
if errorlevel 1 (
    set /p repo_url="请输入GitHub仓库URL (https://github.com/wsndy666/wjgl.git): "
    if "!repo_url!"=="" (
        set repo_url=https://github.com/wsndy666/wjgl.git
        echo [WARNING] 使用默认仓库URL: !repo_url!
    )
    %GIT_CMD% remote add origin "!repo_url!"
    echo [SUCCESS] 远程仓库配置完成: !repo_url!
) else (
    echo [INFO] 远程仓库已配置: 
    %GIT_CMD% remote get-url origin
)

REM 推送到GitHub
echo [INFO] 推送到GitHub...
%GIT_CMD% branch -M main
%GIT_CMD% push -u origin main

echo [SUCCESS] 代码已推送到GitHub

:show_next_steps
echo.
echo [SUCCESS] GitHub上传完成！
echo.
echo 后续步骤：
echo 1. 在GitHub仓库中配置Secrets：
echo    - 进入仓库 Settings → Secrets and variables → Actions
echo    - 添加 DOCKER_USERNAME: 你的Docker Hub用户名
echo    - 添加 DOCKER_PASSWORD: 你的Docker Hub访问令牌
echo.
echo 2. 在Docker Hub创建仓库：
echo    - 创建仓库: wjgl-backend
echo    - 创建仓库: wjgl-frontend
echo.
echo 3. 验证自动构建：
echo    - 查看GitHub Actions是否正常运行
echo    - 检查Docker Hub是否有新镜像
echo.
echo 4. 部署到飞牛NAS：
echo    - 使用 docker-compose.hub.yml 配置
echo    - 运行 deploy-from-hub.sh 脚本
echo.

pause
