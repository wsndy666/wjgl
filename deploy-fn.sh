#!/bin/bash

# 飞牛NAS文件管理系统部署脚本
# 专门针对飞牛NAS系统优化

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查是否在飞牛NAS环境中
check_environment() {
    log_info "检查飞牛NAS环境..."
    
    if [ -f "/etc/fn_version" ]; then
        log_success "检测到飞牛NAS系统"
    else
        log_warning "未检测到飞牛NAS系统，但继续执行部署"
    fi
}

# 设置项目名称
set_project_name() {
    # 从当前目录获取项目名称
    PROJECT_NAME=$(basename "$(pwd)")
    # 移除中文字符，只保留字母数字和连字符
    PROJECT_NAME=$(echo "$PROJECT_NAME" | sed 's/[^a-zA-Z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
    
    if [ -z "$PROJECT_NAME" ]; then
        PROJECT_NAME="file-management"
    fi
    
    export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
    log_info "设置项目名称: $PROJECT_NAME"
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

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    docker-compose down 2>/dev/null || true
    log_success "服务已停止"
}

# 构建和启动服务
deploy_services() {
    log_info "构建Docker镜像..."
    docker-compose build --no-cache
    
    log_info "启动服务..."
    docker-compose up -d
    
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
    echo "管理命令："
    echo "  查看日志: docker-compose logs -f"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart"
    echo "  查看状态: docker-compose ps"
    echo ""
    echo "数据存储位置："
    echo "  文件存储: $(pwd)/data/uploads"
    echo "  数据库: $(pwd)/data/database.sqlite"
    echo "  日志文件: $(pwd)/logs"
    echo ""
}

# 显示服务状态
show_status() {
    echo "服务状态："
    docker-compose ps
    echo ""
    echo "容器资源使用："
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker-compose ps -q) 2>/dev/null || echo "暂无运行中的容器"
}

# 主函数
main() {
    echo "飞牛NAS文件管理系统部署脚本"
    echo "=============================="
    echo ""
    
    case "${1:-deploy}" in
        "deploy")
            check_environment
            set_project_name
            create_directories
            setup_environment
            stop_services
            deploy_services
            wait_for_services
            show_deployment_info
            ;;
        "stop")
            set_project_name
            log_info "停止服务..."
            docker-compose down
            log_success "服务已停止"
            ;;
        "restart")
            set_project_name
            log_info "重启服务..."
            docker-compose restart
            log_success "服务已重启"
            ;;
        "update")
            set_project_name
            log_info "更新服务..."
            docker-compose pull
            docker-compose up -d
            log_success "服务已更新"
            ;;
        "logs")
            set_project_name
            docker-compose logs -f
            ;;
        "status")
            set_project_name
            show_status
            ;;
        "clean")
            set_project_name
            log_warning "这将删除所有数据，确定要继续吗？(y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                docker-compose down -v
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
