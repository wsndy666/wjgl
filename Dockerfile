# 前端构建阶段
FROM node:18-alpine AS frontend-builder

# 安装必要的构建工具
RUN apk add --no-cache git python3 make g++

WORKDIR /app/frontend

# 复制前端package文件
COPY frontend/package*.json ./

# 安装依赖
RUN npm config set loglevel verbose
RUN npm install --legacy-peer-deps || (echo "安装依赖失败，尝试清理缓存..." && npm cache clean --force && npm install --legacy-peer-deps)

# 复制前端源代码
COPY frontend/ .

# 构建前端应用
RUN npx tsc --noEmit || (echo "TypeScript检查失败，以下是详细错误信息:" && npx tsc --noEmit --listFiles --diagnostics && exit 1)
RUN npm run build

# 后端构建阶段
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# 复制后端package文件
COPY backend/package*.json ./

# 安装依赖
RUN npm install --only=production

# 复制后端源代码
COPY backend/ .

# 最终镜像
FROM node:18-alpine

# 安装nginx和curl
RUN apk add --no-cache nginx curl

# 创建必要的目录
RUN mkdir -p /app/data/uploads /app/data/logs /etc/nginx/conf.d /var/www/html

# 配置Nginx
COPY --from=frontend-builder /app/frontend/dist /var/www/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 复制后端应用
COPY --from=backend-builder /app/backend /app/backend

# 设置工作目录
WORKDIR /app/backend

# 创建启动脚本
RUN echo '#!/bin/sh

# 启动nginx
nginx

# 启动后端应用
cd /app/backend
npm start' > /app/start.sh && chmod +x /app/start.sh

# 暴露端口
EXPOSE 80 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 启动服务
CMD ["/app/start.sh"]