#!/bin/bash

echo "===== wjgl文件管理系统 - 快速部署脚本 ====="

# 设置错误时退出
set -e

# 检查Docker是否已安装
if ! command -v docker &> /dev/null; then
  echo "错误: Docker未安装，请先安装Docker。"
  exit 1
fi

# 检查Docker Compose是否已安装
if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null; then
  echo "错误: Docker Compose未安装，请先安装Docker Compose。"
  exit 1
fi

# 创建项目目录
mkdir -p wjgl
cd wjgl

echo "下载docker-compose.yml文件..."
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/wsndy666/wjgl/main/docker-compose.yml

echo "下载env.example文件..."
curl -fsSL -o env.example https://raw.githubusercontent.com/wsndy666/wjgl/main/env.example

# 创建.env文件
echo "创建.env文件..."
cp env.example .env

echo "创建必要的数据目录..."
mkdir -p ./data/uploads
mkdir -p ./data/logs

echo "拉取Docker镜像..."
docker pull wsndy666/wjgl-backend:latest
docker pull wsndy666/wjgl-frontend:latest

echo "启动wjgl文件管理系统..."
docker compose up -d

echo ""
echo "===== 快速部署完成 ====="
echo "前端访问地址: http://$(hostname -I | awk '{print $1}'):3000"
echo "后端API地址: http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "提示: 首次访问请使用默认管理员账户登录。"
echo "如果是在飞牛NAS上部署，请在Docker管理界面中查看wjgl项目。"