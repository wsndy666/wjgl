@echo off

echo ===== wjgl文件管理系统 - 快速部署脚本 =====

REM 检查Docker是否已安装
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 错误: Docker未安装，请先安装Docker Desktop。
    exit /b 1
)

REM 检查Docker Compose是否可用
docker compose version >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 错误: Docker Compose未可用，请确保Docker Desktop已启动。
    exit /b 1
)

REM 创建项目目录
mkdir wjgl 2>nul
cd wjgl

echo 下载docker-compose.yml文件...
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/wsndy666/wjgl/main/docker-compose.yml

echo 下载env.example文件...
curl -fsSL -o env.example https://raw.githubusercontent.com/wsndy666/wjgl/main/env.example

REM 创建.env文件
if not exist .env (
    echo 创建.env文件...
    copy env.example .env
)

REM 创建必要的数据目录
mkdir data\uploads 2>nul
mkdir data\logs 2>nul

echo 拉取Docker镜像...
docker pull wsndy666/wjgl-backend:latest
docker pull wsndy666/wjgl-frontend:latest

echo 启动wjgl文件管理系统...
docker compose up -d

echo.
echo ===== 快速部署完成 =====
echo 前端访问地址: http://localhost:3000
echo 后端API地址: http://localhost:3001
echo.
echo 提示: 首次访问请使用默认管理员账户登录。
echo 如果是在飞牛NAS上部署，请在Docker管理界面中查看wjgl项目。

pause