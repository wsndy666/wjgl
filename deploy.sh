#!/bin/bash

# 文件管理系统部署脚本
# 支持飞牛、群晖等NAS系统

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

# 检查Docker和Docker Compose
check_requirements() {
    log_info "检查系统要求..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "系统要求检查通过"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p data/uploads
    mkdir -p data/logs
    mkdir -p logs
    mkdir -p ssl
    mkdir -p monitoring
    
    log_success "目录创建完成"
}

# 设置权限
set_permissions() {
    log_info "设置文件权限..."
    
    chmod +x deploy.sh
    chmod 755 data
    chmod 755 logs
    
    log_success "权限设置完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            log_warning "已创建 .env 文件，请根据需要修改配置"
        else
            log_error "未找到 env.example 文件"
            exit 1
        fi
    else
        log_info ".env 文件已存在，跳过创建"
    fi
    
    # 生成随机JWT密钥
    if ! grep -q "JWT_SECRET=" .env || grep -q "your-super-secret-jwt-key-change-this" .env; then
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        log_success "已生成新的JWT密钥"
    fi
}

# 构建和启动服务
deploy_services() {
    log_info "构建和启动服务..."
    
    # 停止现有服务
    docker-compose down 2>/dev/null || true
    
    # 构建镜像
    log_info "构建Docker镜像..."
    docker-compose build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    docker-compose up -d
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待后端服务
    for i in {1..30}; do
        if curl -f http://localhost:3001/api/health &>/dev/null; then
            log_success "后端服务已就绪"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "后端服务启动超时"
            exit 1
        fi
        sleep 2
    done
    
    # 等待前端服务
    for i in {1..30}; do
        if curl -f http://localhost:3000 &>/dev/null; then
            log_success "前端服务已就绪"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "前端服务启动超时"
            exit 1
        fi
        sleep 2
    done
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo ""
    echo "访问信息："
    echo "  前端界面: http://localhost"
    echo "  API接口: http://localhost/api"
    echo "  健康检查: http://localhost/api/health"
    echo ""
    echo "默认账户："
    echo "  用户名: admin"
    echo "  密码: admin123"
    echo ""
    echo "管理命令："
    echo "  查看日志: docker-compose logs -f"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart"
    echo "  更新服务: docker-compose pull && docker-compose up -d"
    echo ""
}

# 清理函数
cleanup() {
    log_info "清理临时文件..."
    # 这里可以添加清理逻辑
}

# 主函数
main() {
    echo "文件管理系统部署脚本"
    echo "======================"
    echo ""
    
    # 检查参数
    case "${1:-deploy}" in
        "deploy")
            check_requirements
            create_directories
            set_permissions
            setup_environment
            deploy_services
            wait_for_services
            show_deployment_info
            ;;
        "stop")
            log_info "停止服务..."
            docker-compose down
            log_success "服务已停止"
            ;;
        "restart")
            log_info "重启服务..."
            docker-compose restart
            log_success "服务已重启"
            ;;
        "update")
            log_info "更新服务..."
            docker-compose pull
            docker-compose up -d
            log_success "服务已更新"
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "status")
            docker-compose ps
            ;;
        "clean")
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

# 设置错误处理
trap cleanup EXIT

# 执行主函数
main "$@"
