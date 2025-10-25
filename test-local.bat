@echo off
echo ========================================
echo 文件管理系统 - 本地测试脚本
echo ========================================

echo.
echo 1. 检查环境...
node --version
npm --version

echo.
echo 2. 安装后端依赖...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo 后端依赖安装失败！
    pause
    exit /b 1
)

echo.
echo 3. 安装前端依赖...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
    echo 前端依赖安装失败！
    pause
    exit /b 1
)

echo.
echo 4. 启动后端服务...
cd ../backend
start "后端服务" cmd /k "npm run dev"

echo.
echo 5. 等待后端启动...
timeout /t 5 /nobreak > nul

echo.
echo 6. 启动前端服务...
cd ../frontend
start "前端服务" cmd /k "npm run dev"

echo.
echo ========================================
echo 服务启动完成！
echo ========================================
echo 前端界面: http://localhost:5173
echo 后端API: http://localhost:3001/api
echo ========================================
echo.
echo 按任意键打开浏览器...
pause > nul

start http://localhost:5173

echo.
echo 测试完成后，按任意键关闭所有服务...
pause > nul

echo 正在关闭服务...
taskkill /f /im node.exe > nul 2>&1
echo 服务已关闭！
pause
