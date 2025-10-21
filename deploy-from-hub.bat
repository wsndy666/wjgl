@echo off
setlocal enabledelayedexpansion

:: 从Docker Hub部署文件管理系统
:: 适用于Windows环境

echo 从Docker Hub部署文件管理系统
echo =============================
echo.

:: 颜色定义
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: 日志函数
:log_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:log_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:log_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:log_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:: 检查Docker和Docker Compose
call :log_info "检查系统要求..."

where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :log_error "Docker 未安装，请先安装 Docker"
    exit /b 1
)

where docker-compose >nul 2>&1
if %ERRORLEVEL% equ 0 (
    call :log_success "Docker Compose 已安装"
) else (
    call :log_warning "Docker Compose 未安装，尝试使用 docker compose"
    docker compose version >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        call :log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit /b 1
    )
)

call :log_success "系统要求检查通过"

:: 设置Docker Hub镜像名称
call :log_info "配置Docker Hub镜像..."

if "%DOCKER_USERNAME%"=="" (
    set /p DOCKER_USERNAME="请输入您的Docker Hub用户名 (默认: wsndy666): "
    if "!DOCKER_USERNAME!"=="" set "DOCKER_USERNAME=wsndy666"
)

if "%DOCKER_USERNAME%"=="" (
    call :log_error "Docker Hub用户名不能为空"
    exit /b 1
)

call :log_success "Docker Hub配置完成: %DOCKER_USERNAME%"

:: 创建必要的目录
call :log_info "创建必要的目录..."

if not exist data\uploads mkdir data\uploads
if not exist data\logs mkdir data\logs
if not exist logs mkdir logs
if not exist ssl mkdir ssl

call :log_success "目录创建完成"

:: 配置环境变量
call :log_info "配置环境变量..."

if not exist .env (
    if exist env.example (
        copy env.example .env
        call :log_success "已创建 .env 文件"
    ) else (
        call :log_error "未找到 env.example 文件"
        exit /b 1
    )
) else (
    call :log_info ".env 文件已存在"
)

:: 生成随机JWT密钥
findstr /C:"JWT_SECRET=" .env >nul
if %ERRORLEVEL% neq 0 (
    set "JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%"
    echo JWT_SECRET=!JWT_SECRET! >> .env
    call :log_success "已生成新的JWT密钥"
)

:: 拉取镜像
call :log_info "拉取Docker镜像..."

docker-compose -f docker-compose.hub.yml pull

call :log_success "镜像拉取完成"

:: 停止现有服务
call :log_info "停止现有服务..."
docker-compose -f docker-compose.hub.yml down 2>nul
call :log_success "服务已停止"

:: 启动服务
call :log_info "启动服务..."
docker-compose -f docker-compose.hub.yml up -d
call :log_success "服务启动完成"

:: 等待服务就绪
call :log_info "等待服务就绪..."

:: 等待后端服务
for /l %%i in (1,1,60) do (
    curl -f http://localhost:3001/api/health >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        call :log_success "后端服务已就绪"
        goto :backend_ready
    )
    timeout /t 2 >nul
)
call :log_warning "后端服务启动超时，请检查日志"
:backend_ready

:: 等待前端服务
for /l %%i in (1,1,60) do (
    curl -f http://localhost:3000 >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        call :log_success "前端服务已就绪"
        goto :frontend_ready
    )
    timeout /t 2 >nul
)
call :log_warning "前端服务启动超时，请检查日志"
:frontend_ready

:: 显示部署信息
call :log_success "部署完成！"
echo.
echo 访问信息：
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v 127.0.0.1') do (
    set "IP=%%a"
    goto :found_ip
)
:found_ip
echo   前端界面: http://%IP%:80
echo   API接口: http://%IP%:80/api
echo   健康检查: http://%IP%:80/api/health
echo.
echo 默认账户：
echo   用户名: admin
echo   密码: admin123
echo.
echo 使用的Docker Hub镜像：
echo   后端: %DOCKER_USERNAME%/wjgl-backend:latest
echo   前端: %DOCKER_USERNAME%/wjgl-frontend:latest
echo.
echo 管理命令：
echo   查看日志: docker-compose -f docker-compose.hub.yml logs -f
echo   停止服务: docker-compose -f docker-compose.hub.yml down
echo   重启服务: docker-compose -f docker-compose.hub.yml restart
echo   查看状态: docker-compose -f docker-compose.hub.yml ps
echo.

endlocal