#!/bin/bash

echo "===== wjgl文件管理系统 - 从Docker Hub部署 ====="

# 设置错误时退出
set -e

echo "拉取最新的Docker镜像..."
docker pull wsndy666/wjgl:latest

echo "停止并删除现有容器（如果存在）..."
docker compose down || true

echo "创建必要的数据目录..."
mkdir -p ./data/uploads
mkdir -p ./data/logs

# 检查.env文件是否存在，如果不存在则从示例创建
if [ ! -f .env ]; then
  echo "创建.env文件..."
  cp env.example .env
  echo "请编辑.env文件配置您的系统..."
fi

echo "启动wjgl文件管理系统..."
docker compose up -d

echo ""
echo "===== 部署完成 ====="
echo "前端访问地址: http://localhost:3000"
echo "后端API地址: http://localhost:3001"
echo ""