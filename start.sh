#!/bin/bash

# 简化的启动脚本，解决飞牛NAS部署问题

echo "文件管理系统启动脚本"
echo "===================="

# 设置项目名称（解决"project name must not be empty"错误）
export COMPOSE_PROJECT_NAME=file-management

# 创建必要目录
echo "创建必要目录..."
mkdir -p data/uploads
mkdir -p data/logs
mkdir -p logs

# 设置权限
chmod 755 data
chmod 755 logs

# 检查环境文件
if [ ! -f .env ]; then
    if [ -f env.example ]; then
        echo "创建环境配置文件..."
        cp env.example .env
        # 生成随机JWT密钥
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | head -c 32)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        echo "已生成JWT密钥"
    else
        echo "错误：未找到env.example文件"
        exit 1
    fi
fi

# 停止现有服务
echo "停止现有服务..."
docker-compose down 2>/dev/null || true

# 构建并启动服务
echo "构建Docker镜像..."
docker-compose build

echo "启动服务..."
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

echo ""
echo "部署完成！"
echo "访问地址："
echo "  前端: http://$(hostname -I | awk '{print $1}'):80"
echo "  API: http://$(hostname -I | awk '{print $1}'):80/api"
echo ""
echo "默认账户："
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "管理命令："
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
