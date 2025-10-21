#!/bin/bash

# 飞牛NAS文件管理系统安装脚本
# 解决Docker镜像拉取问题

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

# 检查系统环境
check_environment() {
    log_info "检查系统环境..."
    
    # 检查是否为飞牛NAS
    if [ -f "/etc/fn_version" ]; then
        log_success "检测到飞牛NAS系统"
    else
        log_warning "未检测到飞牛NAS系统，但继续执行"
    fi
    
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
    
    log_success "系统环境检查通过"
}

# 配置Docker镜像源
configure_docker_registry() {
    log_info "配置Docker镜像源..."
    
    # 创建Docker配置目录
    sudo mkdir -p /etc/docker
    
    # 备份现有配置
    if [ -f /etc/docker/daemon.json ]; then
        sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
        log_info "已备份现有Docker配置"
    fi
    
    # 创建新的daemon.json配置
    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
  "insecure-registries": [
    "docker.fnnas.com"
  ],
  "dns": ["8.8.8.8", "8.8.4.4"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    
    log_success "Docker镜像源配置完成"
}

# 重启Docker服务
restart_docker() {
    log_info "重启Docker服务..."
    
    # 重启Docker daemon
    sudo systemctl restart docker
    
    # 等待Docker启动
    sleep 10
    
    # 检查Docker状态
    if systemctl is-active --quiet docker; then
        log_success "Docker服务重启成功"
    else
        log_error "Docker服务重启失败"
        exit 1
    fi
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

# 测试镜像拉取
test_image_pull() {
    log_info "测试镜像拉取..."
    
    # 测试拉取nginx镜像（较小）
    if docker pull nginx:alpine; then
        log_success "nginx:alpine 镜像拉取成功"
    else
        log_warning "nginx:alpine 镜像拉取失败，尝试其他镜像"
        
        # 尝试拉取其他镜像
        if docker pull nginx:latest; then
            log_success "nginx:latest 镜像拉取成功"
        else
            log_error "无法拉取nginx镜像，请检查网络连接"
            return 1
        fi
    fi
}

# 构建和启动服务
deploy_services() {
    log_info "构建和启动服务..."
    
    # 停止现有服务
    docker-compose -f docker-compose-local.yml down 2>/dev/null || true
    
    # 构建镜像
    log_info "构建Docker镜像..."
    docker-compose -f docker-compose-local.yml build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    docker-compose -f docker-compose-local.yml up -d
    
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
    echo "在飞牛NAS Docker管理界面中查看："
    echo "  项目名称: file-management"
    echo "  容器标签: com.fn.nas.managed=true"
    echo ""
    echo "管理命令："
    echo "  查看日志: docker-compose -f docker-compose-local.yml logs -f"
    echo "  停止服务: docker-compose -f docker-compose-local.yml down"
    echo "  重启服务: docker-compose -f docker-compose-local.yml restart"
    echo "  查看状态: docker-compose -f docker-compose-local.yml ps"
    echo ""
}

# 显示服务状态
show_status() {
    echo "服务状态："
    docker-compose -f docker-compose-local.yml ps
    echo ""
    echo "容器资源使用："
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker-compose -f docker-compose-local.yml ps -q) 2>/dev/null || echo "暂无运行中的容器"
}

# 主函数
main() {
    echo "飞牛NAS文件管理系统安装脚本"
    echo "=============================="
    echo ""
    
    case "${1:-install}" in
        "install")
            check_environment
            configure_docker_registry
            restart_docker
            test_image_pull
            create_directories
            setup_environment
            deploy_services
            wait_for_services
            show_deployment_info
            ;;
        "test")
            test_image_pull
            ;;
        "status")
            show_status
            ;;
        "logs")
            docker-compose -f docker-compose-local.yml logs -f
            ;;
        "restart")
            docker-compose -f docker-compose-local.yml restart
            log_success "服务已重启"
            ;;
        "stop")
            docker-compose -f docker-compose-local.yml down
            log_success "服务已停止"
            ;;
        "clean")
            log_warning "这将删除所有数据，确定要继续吗？(y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                docker-compose -f docker-compose-local.yml down -v
                docker system prune -f
                log_success "清理完成"
            else
                log_info "取消清理"
            fi
            ;;
        *)
            echo "用法: $0 {install|test|status|logs|restart|stop|clean}"
            echo ""
            echo "命令说明："
            echo "  install  - 安装服务（默认）"
            echo "  test     - 测试镜像拉取"
            echo "  status   - 查看状态"
            echo "  logs     - 查看日志"
            echo "  restart  - 重启服务"
            echo "  stop     - 停止服务"
            echo "  clean    - 清理数据"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
