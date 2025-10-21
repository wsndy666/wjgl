#!/bin/bash

# wjgl 文件管理系统快速部署脚本
# GitHub: wsndy666/wjgl

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

# 显示项目信息
show_project_info() {
    echo "wjgl 文件管理系统快速部署"
    echo "=========================="
    echo ""
    echo "GitHub仓库: https://github.com/wsndy666/wjgl"
    echo "Docker Hub镜像: wsndy666/wjgl-backend, wsndy666/wjgl-frontend"
    echo ""
}

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        if ! docker compose version &> /dev/null; then
            log_error "Docker Compose 未安装，请先安装 Docker Compose"
            exit 1
        fi
    fi
    
    log_success "系统要求检查通过"
}

# 创建项目目录
create_project_dir() {
    log_info "创建项目目录..."
    
    # 创建项目目录
    mkdir -p wjgl-file-management
    cd wjgl-file-management
    
    log_success "项目目录创建完成"
}

# 下载项目文件
download_project() {
    log_info "下载项目文件..."
    
    # 下载docker-compose.hub.yml
    curl -o docker-compose.hub.yml https://raw.githubusercontent.com/wsndy666/wjgl/main/docker-compose.hub.yml
    
    # 下载nginx.conf
    curl -o nginx.conf https://raw.githubusercontent.com/wsndy666/wjgl/main/nginx.conf
    
    # 下载env.example
    curl -o env.example https://raw.githubusercontent.com/wsndy666/wjgl/main/env.example
    
    # 下载部署脚本
    curl -o deploy-from-hub.sh https://raw.githubusercontent.com/wsndy666/wjgl/main/deploy-from-hub.sh
    chmod +x deploy-from-hub.sh
    
    log_success "项目文件下载完成"
}

# 配置环境
setup_environment() {
    log_info "配置环境..."
    
    # 创建必要目录
    mkdir -p data/uploads data/logs logs ssl
    chmod 755 data logs
    
    # 创建.env文件
    if [ ! -f .env ]; then
        cp env.example .env
        
        # 生成随机JWT密钥
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | head -c 32)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        
        log_success "环境配置完成"
    else
        log_info ".env 文件已存在"
    fi
}

# 更新Docker Hub用户名
update_docker_hub_username() {
    log_info "更新Docker Hub用户名..."
    
    # 更新docker-compose.hub.yml中的用户名
    sed -i "s/your-dockerhub-username/wsndy666/g" docker-compose.hub.yml
    
    log_success "Docker Hub用户名更新完成"
}

# 部署服务
deploy_services() {
    log_info "部署服务..."
    
    # 停止现有服务
    docker-compose -f docker-compose.hub.yml down 2>/dev/null || true
    
    # 拉取镜像
    log_info "拉取Docker镜像..."
    docker-compose -f docker-compose.hub.yml pull
    
    # 启动服务
    log_info "启动服务..."
    docker-compose -f docker-compose.hub.yml up -d
    
    log_success "服务部署完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待后端服务
    for i in {1..60}; do
        if curl -f http://localhost:3001/api/health &>/dev/null 2>&1; then
            log_success "后端服务已就绪"
            break
        fi
        if [ $i -eq 60 ]; then
            log_warning "后端服务启动超时，请检查日志"
            break
        fi
        sleep 2
    done
    
    # 等待前端服务
    for i in {1..60}; do
        if curl -f http://localhost:3000 &>/dev/null 2>&1; then
            log_success "前端服务已就绪"
            break
        fi
        if [ $i -eq 60 ]; then
            log_warning "前端服务启动超时，请检查日志"
            break
        fi
        sleep 2
    done
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo ""
    echo "访问信息："
    echo "  前端界面: http://$(hostname -I | awk '{print $1}'):80"
    echo "  API接口: http://$(hostname -I | awk '{print $1}'):80/api"
    echo "  健康检查: http://$(hostname -I | awk '{print $1}'):80/api/health"
    echo ""
    echo "默认账户："
    echo "  用户名: admin"
    echo "  密码: admin123"
    echo ""
    echo "使用的Docker Hub镜像："
    echo "  后端: wsndy666/wjgl-backend:latest"
    echo "  前端: wsndy666/wjgl-frontend:latest"
    echo ""
    echo "管理命令："
    echo "  查看日志: docker-compose -f docker-compose.hub.yml logs -f"
    echo "  停止服务: docker-compose -f docker-compose.hub.yml down"
    echo "  重启服务: docker-compose -f docker-compose.hub.yml restart"
    echo "  查看状态: docker-compose -f docker-compose.hub.yml ps"
    echo ""
    echo "GitHub仓库: https://github.com/wsndy666/wjgl"
    echo ""
}

# 主函数
main() {
    show_project_info
    
    case "${1:-deploy}" in
        "deploy")
            check_requirements
            create_project_dir
            download_project
            setup_environment
            update_docker_hub_username
            deploy_services
            wait_for_services
            show_deployment_info
            ;;
        "status")
            docker-compose -f docker-compose.hub.yml ps
            ;;
        "logs")
            docker-compose -f docker-compose.hub.yml logs -f
            ;;
        "restart")
            docker-compose -f docker-compose.hub.yml restart
            log_success "服务已重启"
            ;;
        "stop")
            docker-compose -f docker-compose.hub.yml down
            log_success "服务已停止"
            ;;
        *)
            echo "用法: $0 {deploy|status|logs|restart|stop}"
            echo ""
            echo "命令说明："
            echo "  deploy  - 部署服务（默认）"
            echo "  status  - 查看状态"
            echo "  logs    - 查看日志"
            echo "  restart - 重启服务"
            echo "  stop    - 停止服务"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
