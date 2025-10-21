#!/bin/bash

# 修复飞牛NAS Docker镜像拉取问题

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

# 检查Docker配置
check_docker_config() {
    log_info "检查Docker配置..."
    
    # 检查Docker daemon配置
    if [ -f /etc/docker/daemon.json ]; then
        log_info "当前Docker daemon配置："
        cat /etc/docker/daemon.json
    else
        log_warning "未找到Docker daemon配置文件"
    fi
}

# 配置Docker镜像源
configure_docker_registry() {
    log_info "配置Docker镜像源..."
    
    # 创建Docker daemon配置目录
    sudo mkdir -p /etc/docker
    
    # 备份现有配置
    if [ -f /etc/docker/daemon.json ]; then
        sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup
        log_info "已备份现有配置"
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
  "dns": ["8.8.8.8", "8.8.4.4"]
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
    sleep 5
    
    # 检查Docker状态
    if systemctl is-active --quiet docker; then
        log_success "Docker服务重启成功"
    else
        log_error "Docker服务重启失败"
        exit 1
    fi
}

# 测试镜像拉取
test_image_pull() {
    log_info "测试镜像拉取..."
    
    # 测试拉取node镜像
    if docker pull node:18-alpine; then
        log_success "node:18-alpine 镜像拉取成功"
    else
        log_warning "node:18-alpine 镜像拉取失败，尝试其他镜像源"
        
        # 尝试拉取其他版本的node镜像
        if docker pull node:18; then
            log_success "node:18 镜像拉取成功"
        else
            log_error "无法拉取node镜像，请检查网络连接"
            exit 1
        fi
    fi
}

# 清理Docker缓存
clean_docker_cache() {
    log_info "清理Docker缓存..."
    
    # 清理构建缓存
    docker builder prune -f
    
    # 清理未使用的镜像
    docker image prune -f
    
    log_success "Docker缓存清理完成"
}

# 显示网络诊断信息
show_network_diagnosis() {
    log_info "网络诊断信息："
    
    echo "1. 检查网络连接："
    ping -c 3 docker.io || echo "无法连接到docker.io"
    ping -c 3 registry-1.docker.io || echo "无法连接到registry-1.docker.io"
    
    echo ""
    echo "2. 检查DNS解析："
    nslookup docker.io || echo "DNS解析失败"
    
    echo ""
    echo "3. 检查Docker信息："
    docker info | grep -E "(Registry|Mirrors|Insecure)" || echo "未找到镜像源配置"
}

# 主函数
main() {
    echo "飞牛NAS Docker镜像拉取问题修复脚本"
    echo "=================================="
    echo ""
    
    case "${1:-fix}" in
        "fix")
            check_docker_config
            configure_docker_registry
            restart_docker
            test_image_pull
            log_success "修复完成！"
            ;;
        "test")
            test_image_pull
            ;;
        "clean")
            clean_docker_cache
            ;;
        "diagnose")
            show_network_diagnosis
            ;;
        "restore")
            if [ -f /etc/docker/daemon.json.backup ]; then
                sudo cp /etc/docker/daemon.json.backup /etc/docker/daemon.json
                sudo systemctl restart docker
                log_success "配置已恢复"
            else
                log_error "未找到备份配置文件"
            fi
            ;;
        *)
            echo "用法: $0 {fix|test|clean|diagnose|restore}"
            echo ""
            echo "命令说明："
            echo "  fix      - 修复Docker镜像拉取问题（默认）"
            echo "  test     - 测试镜像拉取"
            echo "  clean    - 清理Docker缓存"
            echo "  diagnose - 网络诊断"
            echo "  restore  - 恢复原始配置"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
