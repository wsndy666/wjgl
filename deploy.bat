@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 文件管理系统部署脚本 (Windows版本)
REM 支持飞牛、群晖等NAS系统

echo 文件管理系统部署脚本
echo ======================
echo.

REM 检查Docker和Docker Compose
echo [INFO] 检查系统要求...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker 未安装，请先安装 Docker Desktop
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

REM 创建必要的目录
echo [INFO] 创建必要的目录...
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads
if not exist "data\logs" mkdir data\logs
if not exist "logs" mkdir logs
if not exist "ssl" mkdir ssl
if not exist "monitoring" mkdir monitoring

echo [SUCCESS] 目录创建完成

REM 配置环境变量
echo [INFO] 配置环境变量...
if not exist ".env" (
    if exist "env.example" (
        copy env.example .env >nul
        echo [WARNING] 已创建 .env 文件，请根据需要修改配置
    ) else (
        echo [ERROR] 未找到 env.example 文件
        pause
        exit /b 1
    )
) else (
    echo [INFO] .env 文件已存在，跳过创建
)

REM 停止现有服务
echo [INFO] 停止现有服务...
docker-compose down >nul 2>&1

REM 构建镜像
echo [INFO] 构建Docker镜像...
docker-compose build --no-cache
if errorlevel 1 (
    echo [ERROR] 镜像构建失败
    pause
    exit /b 1
)

REM 启动服务
echo [INFO] 启动服务...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] 服务启动失败
    pause
    exit /b 1
)

echo [SUCCESS] 服务启动完成

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
echo 管理命令：
echo   查看日志: docker-compose logs -f
echo   停止服务: docker-compose down
echo   重启服务: docker-compose restart
echo   更新服务: docker-compose pull ^&^& docker-compose up -d
echo.

pause
