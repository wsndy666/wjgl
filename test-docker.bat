@echo off
echo ========================================
echo 文件管理系统 - Docker测试脚本
echo ========================================

echo.
echo 1. 检查Docker环境...
docker --version
if %errorlevel% neq 0 (
    echo Docker未安装或未启动！
    echo 请先安装Docker Desktop并启动
    pause
    exit /b 1
)

echo.
echo 2. 停止现有容器...
docker stop wjgl-test > nul 2>&1
docker rm wjgl-test > nul 2>&1

echo.
echo 3. 构建Docker镜像...
docker build -t wjgl-local .
if %errorlevel% neq 0 (
    echo Docker镜像构建失败！
    pause
    exit /b 1
)

echo.
echo 4. 运行Docker容器...
docker run -d ^
  --name wjgl-test ^
  -p 9999:80 ^
  -p 8888:3001 ^
  -v wjgl-data:/app/data ^
  wjgl-local

if %errorlevel% neq 0 (
    echo Docker容器启动失败！
    pause
    exit /b 1
)

echo.
echo 5. 等待服务启动...
timeout /t 10 /nobreak > nul

echo.
echo 6. 检查容器状态...
docker ps | findstr wjgl-test

echo.
echo ========================================
echo Docker测试环境启动完成！
echo ========================================
echo 前端界面: http://localhost:9999
echo 后端API: http://localhost:9999/api
echo 健康检查: http://localhost:9999/api/health
echo ========================================
echo.
echo 按任意键打开浏览器...
pause > nul

start http://localhost:9999

echo.
echo 按任意键查看容器日志...
pause > nul

echo 显示容器日志（按Ctrl+C退出）:
docker logs -f wjgl-test
