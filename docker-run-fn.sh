#!/bin/bash

# 飞牛NAS单容器部署脚本
# 适用于飞牛NAS Docker管理界面

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

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p data/uploads
    mkdir -p data/logs
    mkdir -p logs
    mkdir -p ssl
    
    # 设置权限
    chmod 755 data
    chmod 755 logs
    
    log_success "目录创建完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            log_success "已创建 .env 文件"
        else
            log_error "未找到 env.example 文件"
            exit 1
        fi
    else
        log_info ".env 文件已存在"
    fi
    
    # 生成随机JWT密钥
    if ! grep -q "JWT_SECRET=" .env || grep -q "your-super-secret-jwt-key-change-this" .env; then
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | head -c 32)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        log_success "已生成新的JWT密钥"
    fi
}

# 停止现有容器
stop_containers() {
    log_info "停止现有容器..."
    
    # 停止并删除现有容器
    docker stop file-management-backend 2>/dev/null || true
    docker stop file-management-frontend 2>/dev/null || true
    docker stop file-management-nginx 2>/dev/null || true
    
    docker rm file-management-backend 2>/dev/null || true
    docker rm file-management-frontend 2>/dev/null || true
    docker rm file-management-nginx 2>/dev/null || true
    
    log_success "容器已停止"
}

# 构建镜像
build_images() {
    log_info "构建Docker镜像..."
    
    # 构建后端镜像
    docker build -t file-management-backend:latest ./backend
    
    # 构建前端镜像
    docker build -t file-management-frontend:latest ./frontend
    
    log_success "镜像构建完成"
}

# 启动容器
start_containers() {
    log_info "启动容器..."
    
    # 创建网络
    docker network create file-management-network 2>/dev/null || true
    
    # 启动后端容器
    docker run -d \
        --name file-management-backend \
        --network file-management-network \
        -p 3001:3001 \
        -e NODE_ENV=production \
        -e PORT=3001 \
        -e DB_PATH=/app/data/database.sqlite \
        -e JWT_SECRET=$(grep JWT_SECRET .env | cut -d'=' -f2) \
        -e UPLOAD_PATH=/app/data/uploads \
        -v "$(pwd)/data:/app/data" \
        -v "$(pwd)/logs:/app/logs" \
        --restart unless-stopped \
        --label "com.fn.nas.managed=true" \
        --label "com.fn.nas.category=file-management" \
        --label "com.fn.nas.description=文件管理系统后端服务" \
        file-management-backend:latest
    
    # 启动前端容器
    docker run -d \
        --name file-management-frontend \
        --network file-management-network \
        -p 3000:80 \
        --restart unless-stopped \
        --label "com.fn.nas.managed=true" \
        --label "com.fn.nas.category=file-management" \
        --label "com.fn.nas.description=文件管理系统前端界面" \
        file-management-frontend:latest
    
    # 启动Nginx容器
    docker run -d \
        --name file-management-nginx \
        --network file-management-network \
        -p 80:80 \
        -p 443:443 \
        -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" \
        -v "$(pwd)/data:/var/www/data:ro" \
        -v "$(pwd)/ssl:/etc/nginx/ssl:ro" \
        --restart unless-stopped \
        --label "com.fn.nas.managed=true" \
        --label "com.fn.nas.category=file-management" \
        --label "com.fn.nas.description=文件管理系统反向代理" \
        nginx:alpine
    
    log_success "容器启动完成"
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
    echo "在飞牛NAS Docker管理界面中查看："
    echo "  容器名称: file-management-*"
    echo "  容器标签: com.fn.nas.managed=true"
    echo ""
    echo "管理命令："
    echo "  查看日志: docker logs file-management-backend"
    echo "  停止服务: docker stop file-management-backend file-management-frontend file-management-nginx"
    echo "  重启服务: docker restart file-management-backend file-management-frontend file-management-nginx"
    echo "  查看状态: docker ps | grep file-management"
    echo ""
}

# 显示服务状态
show_status() {
    echo "服务状态："
    docker ps | grep file-management
    echo ""
    echo "容器资源使用："
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker ps -q --filter "name=file-management") 2>/dev/null || echo "暂无运行中的容器"
}

# 主函数
main() {
    echo "飞牛NAS文件管理系统单容器部署脚本"
    echo "=================================="
    echo ""
    
    case "${1:-deploy}" in
        "deploy")
            create_directories
            setup_environment
            stop_containers
            build_images
            start_containers
            wait_for_services
            show_deployment_info
            ;;
        "stop")
            log_info "停止服务..."
            docker stop file-management-backend file-management-frontend file-management-nginx
            log_success "服务已停止"
            ;;
        "restart")
            log_info "重启服务..."
            docker restart file-management-backend file-management-frontend file-management-nginx
            log_success "服务已重启"
            ;;
        "update")
            log_info "更新服务..."
            stop_containers
            build_images
            start_containers
            log_success "服务已更新"
            ;;
        "logs")
            docker logs -f file-management-backend
            ;;
        "status")
            show_status
            ;;
        "clean")
            log_warning "这将删除所有数据，确定要继续吗？(y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                docker stop file-management-backend file-management-frontend file-management-nginx
                docker rm file-management-backend file-management-frontend file-management-nginx
                docker network rm file-management-network
                docker system prune -f
                log_success "清理完成"
            else
                log_info "取消清理"
            fi
            ;;
        *)
            echo "用法: $0 {deploy|stop|restart|update|logs|status|clean}"
            echo ""
            echo "命令说明："
            echo "  deploy  - 部署服务（默认）"
            echo "  stop    - 停止服务"
            echo "  restart - 重启服务"
            echo "  update  - 更新服务"
            echo "  logs    - 查看日志"
            echo "  status  - 查看状态"
            echo "  clean   - 清理数据"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
