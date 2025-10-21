@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM wjgl 文件管理系统快速部署脚本
REM GitHub: wsndy666/wjgl

echo wjgl 文件管理系统快速部署
echo ==========================
echo.
echo GitHub仓库: https://github.com/wsndy666/wjgl
echo Docker Hub镜像: wsndy666/wjgl-backend, wsndy666/wjgl-frontend
echo.

REM 检查系统要求
echo [INFO] 检查系统要求...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker 未安装，请先安装 Docker
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose 未安装，请先安装 Docker Compose
    pause
    exit /b 1
)

echo [SUCCESS] 系统要求检查通过

REM 创建项目目录
echo [INFO] 创建项目目录...
if not exist "wjgl-file-management" mkdir wjgl-file-management
cd wjgl-file-management

echo [SUCCESS] 项目目录创建完成

REM 下载项目文件
echo [INFO] 下载项目文件...

REM 下载docker-compose.hub.yml
curl -o docker-compose.hub.yml https://raw.githubusercontent.com/wsndy666/wjgl/main/docker-compose.hub.yml

REM 下载nginx.conf
curl -o nginx.conf https://raw.githubusercontent.com/wsndy666/wjgl/main/nginx.conf

REM 下载env.example
curl -o env.example https://raw.githubusercontent.com/wsndy666/wjgl/main/env.example

REM 下载部署脚本
curl -o deploy-from-hub.sh https://raw.githubusercontent.com/wsndy666/wjgl/main/deploy-from-hub.sh

echo [SUCCESS] 项目文件下载完成

REM 配置环境
echo [INFO] 配置环境...

REM 创建必要目录
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\logs" mkdir data\logs
if not exist "logs" mkdir logs
if not exist "ssl" mkdir ssl

REM 创建.env文件
if not exist ".env" (
    copy env.example .env >nul
    echo [SUCCESS] 环境配置完成
) else (
    echo [INFO] .env 文件已存在
)

REM 更新Docker Hub用户名
echo [INFO] 更新Docker Hub用户名...
powershell -Command "(Get-Content docker-compose.hub.yml) -replace 'your-dockerhub-username', 'wsndy666' | Set-Content docker-compose.hub.yml"

echo [SUCCESS] Docker Hub用户名更新完成

REM 部署服务
echo [INFO] 部署服务...

REM 停止现有服务
docker-compose -f docker-compose.hub.yml down >nul 2>&1

REM 拉取镜像
echo [INFO] 拉取Docker镜像...
docker-compose -f docker-compose.hub.yml pull

REM 启动服务
echo [INFO] 启动服务...
docker-compose -f docker-compose.hub.yml up -d

echo [SUCCESS] 服务部署完成

REM 等待服务就绪
echo [INFO] 等待服务就绪...
timeout /t 10 /nobreak >nul

REM 显示部署信息
echo.
echo [SUCCESS] 部署完成！
echo.
echo 访问信息：
echo   前端界面: http://localhost
echo   API接口: http://localhost/api
echo   健康检查: http://localhost/api/health
echo.
echo 默认账户：
echo   用户名: admin
echo   密码: admin123
echo.
echo 使用的Docker Hub镜像：
echo   后端: wsndy666/wjgl-backend:latest
echo   前端: wsndy666/wjgl-frontend:latest
echo.
echo 管理命令：
echo   查看日志: docker-compose -f docker-compose.hub.yml logs -f
echo   停止服务: docker-compose -f docker-compose.hub.yml down
echo   重启服务: docker-compose -f docker-compose.hub.yml restart
echo   查看状态: docker-compose -f docker-compose.hub.yml ps
echo.
echo GitHub仓库: https://github.com/wsndy666/wjgl
echo.

pause
