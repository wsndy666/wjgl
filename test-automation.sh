#!/bin/bash

# 测试GitHub和Docker Hub自动化流程
# 此脚本用于测试GitHub Actions和Docker Hub自动构建

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查GitHub配置
check_github() {
    log_info "检查GitHub配置..."
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
    
    # 检查远程仓库
    if ! git remote get-url origin &> /dev/null; then
        log_error "未配置远程仓库，请先运行 upload-to-github.sh"
        exit 1
    fi
    
    # 检查GitHub Actions配置
    if [ ! -f ".github/workflows/docker-build-push.yml" ]; then
        log_error "未找到GitHub Actions配置，请先运行 upload-to-github.sh"
        exit 1
    fi
    
    log_success "GitHub配置检查通过"
}

# 检查Docker Hub配置
check_docker_hub() {
    log_info "检查Docker Hub配置..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查Docker Hub登录
    echo -n "请输入您的Docker Hub用户名: "
    read -r DOCKER_USERNAME
    
    if [ -z "$DOCKER_USERNAME" ]; then
        log_error "Docker Hub用户名不能为空"
        exit 1
    fi
    
    echo -n "请输入您的Docker Hub密码或访问令牌: "
    read -r -s DOCKER_PASSWORD
    echo ""
    
    if [ -z "$DOCKER_PASSWORD" ]; then
        log_error "Docker Hub密码或访问令牌不能为空"
        exit 1
    fi
    
    # 尝试登录Docker Hub
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
    
    if [ $? -ne 0 ]; then
        log_error "Docker Hub登录失败，请检查用户名和密码"
        exit 1
    fi
    
    log_success "Docker Hub配置检查通过"
}

# 测试GitHub Actions
test_github_actions() {
    log_info "测试GitHub Actions..."
    
    # 检查GitHub Actions状态
    REPO_URL=$(git remote get-url origin)
    REPO_NAME=$(echo "$REPO_URL" | sed -E 's/.*[\/:]([^\/]+)\/([^\/]+)\.git/\1\/\2/')
    
    echo "GitHub仓库: $REPO_NAME"
    echo "请在浏览器中访问以下链接，检查GitHub Actions状态："
    echo "https://github.com/$REPO_NAME/actions"
    echo ""
    echo "按任意键继续..."
    read -n 1 -s
    
    log_success "GitHub Actions测试完成"
}

# 测试Docker Hub镜像
test_docker_hub_images() {
    log_info "测试Docker Hub镜像..."
    
    echo -n "请输入您的Docker Hub用户名: "
    read -r DOCKER_USERNAME
    
    if [ -z "$DOCKER_USERNAME" ]; then
        log_error "Docker Hub用户名不能为空"
        exit 1
    fi
    
    # 尝试拉取镜像
    log_info "尝试拉取后端镜像..."
    if docker pull "$DOCKER_USERNAME/wjgl-backend:latest"; then
        log_success "后端镜像拉取成功"
    else
        log_warning "后端镜像拉取失败，可能尚未构建完成"
    fi
    
    log_info "尝试拉取前端镜像..."
    if docker pull "$DOCKER_USERNAME/wjgl-frontend:latest"; then
        log_success "前端镜像拉取成功"
    else
        log_warning "前端镜像拉取失败，可能尚未构建完成"
    fi
    
    log_success "Docker Hub镜像测试完成"
}

# 测试部署
test_deployment() {
    log_info "测试部署..."
    
    # 检查部署脚本
    if [ ! -f "deploy-from-hub.sh" ]; then
        log_error "未找到部署脚本 deploy-from-hub.sh"
        exit 1
    fi
    
    # 询问是否执行部署
    echo -n "是否执行部署测试？(y/N): "
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # 执行部署
        chmod +x deploy-from-hub.sh
        ./deploy-from-hub.sh
    else
        log_info "跳过部署测试"
    fi
    
    log_success "部署测试完成"
}

# 显示测试结果
show_test_results() {
    log_success "自动化流程测试完成！"
    echo ""
    echo "测试结果："
    echo "  GitHub配置: 通过"
    echo "  Docker Hub配置: 通过"
    echo "  GitHub Actions: 请查看GitHub仓库的Actions页面"
    echo "  Docker Hub镜像: 请查看Docker Hub仓库"
    echo "  部署测试: 请检查服务是否正常运行"
    echo ""
    echo "后续步骤："
    echo "  1. 确保GitHub Actions工作流成功运行"
    echo "  2. 确保Docker Hub镜像成功构建"
    echo "  3. 使用 deploy-from-hub.sh 脚本部署到生产环境"
    echo ""
}

# 主函数
main() {
    echo "测试GitHub和Docker Hub自动化流程"
    echo "================================"
    echo ""
    
    check_github
    check_docker_hub
    test_github_actions
    test_docker_hub_images
    test_deployment
    show_test_results
}

# 执行主函数
main