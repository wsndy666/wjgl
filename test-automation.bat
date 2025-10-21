@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 测试GitHub和Docker Hub自动化流程
REM 此脚本用于测试GitHub Actions和Docker Hub自动构建

echo 测试GitHub和Docker Hub自动化流程
echo ================================
echo.

REM 颜色定义
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM 日志函数
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

REM 检查GitHub配置
call :log_info "检查GitHub配置..."

REM 检查Git
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :log_error "Git 未安装，请先安装 Git"
    pause
    exit /b 1
)

REM 检查远程仓库
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :log_error "未配置远程仓库，请先运行 upload-to-github.bat"
    pause
    exit /b 1
)

REM 检查GitHub Actions配置
if not exist ".github\workflows\docker-build-push.yml" (
    call :log_error "未找到GitHub Actions配置，请先运行 upload-to-github.bat"
    pause
    exit /b 1
)

call :log_success "GitHub配置检查通过"

REM 检查Docker Hub配置
call :log_info "检查Docker Hub配置..."

REM 检查Docker
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    call :log_error "Docker 未安装，请先安装 Docker"
    pause
    exit /b 1
)

REM 检查Docker Hub登录
set /p DOCKER_USERNAME="请输入您的Docker Hub用户名: "

if "!DOCKER_USERNAME!"=="" (
    call :log_error "Docker Hub用户名不能为空"
    pause
    exit /b 1
)

set /p DOCKER_PASSWORD="请输入您的Docker Hub密码或访问令牌: "

if "!DOCKER_PASSWORD!"=="" (
    call :log_error "Docker Hub密码或访问令牌不能为空"
    pause
    exit /b 1
)

REM 尝试登录Docker Hub
echo !DOCKER_PASSWORD! | docker login -u !DOCKER_USERNAME! --password-stdin

if %ERRORLEVEL% neq 0 (
    call :log_error "Docker Hub登录失败，请检查用户名和密码"
    pause
    exit /b 1
)

call :log_success "Docker Hub配置检查通过"

REM 测试GitHub Actions
call :log_info "测试GitHub Actions..."

REM 检查GitHub Actions状态
for /f "tokens=*" %%a in ('git remote get-url origin') do set REPO_URL=%%a
set REPO_NAME=!REPO_URL!
set REPO_NAME=!REPO_NAME:https://github.com/=!
set REPO_NAME=!REPO_NAME:.git=!

echo GitHub仓库: !REPO_NAME!
echo 请在浏览器中访问以下链接，检查GitHub Actions状态：
echo https://github.com/!REPO_NAME!/actions
echo.
echo 按任意键继续...
pause >nul

call :log_success "GitHub Actions测试完成"

REM 测试Docker Hub镜像
call :log_info "测试Docker Hub镜像..."

set /p DOCKER_USERNAME="请输入您的Docker Hub用户名: "

if "!DOCKER_USERNAME!"=="" (
    call :log_error "Docker Hub用户名不能为空"
    pause
    exit /b 1
)

REM 尝试拉取镜像
call :log_info "尝试拉取后端镜像..."
docker pull "!DOCKER_USERNAME!/wjgl-backend:latest"

if %ERRORLEVEL% equ 0 (
    call :log_success "后端镜像拉取成功"
) else (
    call :log_warning "后端镜像拉取失败，可能尚未构建完成"
)

call :log_info "尝试拉取前端镜像..."
docker pull "!DOCKER_USERNAME!/wjgl-frontend:latest"

if %ERRORLEVEL% equ 0 (
    call :log_success "前端镜像拉取成功"
) else (
    call :log_warning "前端镜像拉取失败，可能尚未构建完成"
)

call :log_success "Docker Hub镜像测试完成"

REM 测试部署
call :log_info "测试部署..."

REM 检查部署脚本
if not exist "deploy-from-hub.bat" (
    call :log_error "未找到部署脚本 deploy-from-hub.bat"
    pause
    exit /b 1
)

REM 询问是否执行部署
set /p response="是否执行部署测试？(y/N): "

if /i "!response!"=="y" (
    REM 执行部署
    call deploy-from-hub.bat
) else (
    call :log_info "跳过部署测试"
)

call :log_success "部署测试完成"

REM 显示测试结果
call :log_success "自动化流程测试完成！"
echo.
echo 测试结果：
echo   GitHub配置: 通过
echo   Docker Hub配置: 通过
echo   GitHub Actions: 请查看GitHub仓库的Actions页面
echo   Docker Hub镜像: 请查看Docker Hub仓库
echo   部署测试: 请检查服务是否正常运行
echo.
echo 后续步骤：
echo   1. 确保GitHub Actions工作流成功运行
echo   2. 确保Docker Hub镜像成功构建
echo   3. 使用 deploy-from-hub.bat 脚本部署到生产环境
echo.

pause