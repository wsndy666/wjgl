#!/bin/bash

# 从Docker Hub部署文件管理系统
# 适用于飞牛NAS等系统

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

# 检查Docker和Docker Compose
check_requirements() {
    log_info "检查系统要求..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_success "Docker Compose 已安装"
    else
        log_warning "Docker Compose 未安装，尝试使用 docker compose"
        if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
            log_error "Docker Compose 未安装，请先安装 Docker Compose"
            exit 1
        fi
    fi
    
    log_success "系统要求检查通过"
}

# 设置Docker Hub镜像名称
setup_docker_hub() {
    log_info "配置Docker Hub镜像..."
    
    # 从用户输入获取Docker Hub用户名
    if [ -z "$DOCKER_USERNAME" ]; then
        echo -n "请输入您的Docker Hub用户名 (默认: wsndy666): "
        read -r DOCKER_USERNAME
        if [ -z "$DOCKER_USERNAME" ]; then
            DOCKER_USERNAME="wsndy666"
        fi
    fi
    
    if [ -z "$DOCKER_USERNAME" ]; then
        log_error "Docker Hub用户名不能为空"
        exit 1
    fi
    
    # 导出环境变量，供docker-compose.hub.yml使用
    export DOCKER_USERNAME
    
    log_success "Docker Hub配置完成: $DOCKER_USERNAME"
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

# 拉取镜像
pull_images() {
    log_info "拉取Docker镜像..."
    
    docker-compose -f docker-compose.hub.yml pull
    
    log_success "镜像拉取完成"
}

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    docker-compose -f docker-compose.hub.yml down 2>/dev/null || true
    log_success "服务已停止"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    docker-compose -f docker-compose.hub.yml up -d
    log_success "服务启动完成"
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
    echo "  后端: $DOCKER_USERNAME/wjgl-backend:latest"
    echo "  前端: $DOCKER_USERNAME/wjgl-frontend:latest"
    echo ""
    echo "管理命令："
    echo "  查看日志: docker-compose -f docker-compose.hub.yml logs -f"
    echo "  停止服务: docker-compose -f docker-compose.hub.yml down"
    echo "  重启服务: docker-compose -f docker-compose.hub.yml restart"
    echo "  查看状态: docker-compose -f docker-compose.hub.yml ps"
    echo ""
}

# 显示服务状态
show_status() {
    echo "服务状态："
    docker-compose -f docker-compose.hub.yml ps
    echo ""
    echo "容器资源使用："
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker-compose -f docker-compose.hub.yml ps -q) 2>/dev/null || echo "暂无运行中的容器"
}

# 主函数
main() {
    echo "从Docker Hub部署文件管理系统"
    echo "============================="
    echo ""
    
    case "${1:-deploy}" in
        "deploy")
            check_requirements
            setup_docker_hub
            create_directories
            setup_environment
            stop_services
            pull_images
            start_services
            wait_for_services
            show_deployment_info
            ;;
        "stop")
            log_info "停止服务..."
            docker-compose -f docker-compose.hub.yml down
            log_success "服务已停止"
            ;;
        "restart")
            log_info "重启服务..."
            docker-compose -f docker-compose.hub.yml restart
            log_success "服务已重启"
            ;;
        "update")
            log_info "更新服务..."
            docker-compose -f docker-compose.hub.yml pull
            docker-compose -f docker-compose.hub.yml up -d
            log_success "服务已更新"
            ;;
        "logs")
            docker-compose -f docker-compose.hub.yml logs -f
            ;;
        "status")
            show_status
            ;;
        "clean")
            log_warning "这将删除所有数据，确定要继续吗？(y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                docker-compose -f docker-compose.hub.yml down -v
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
