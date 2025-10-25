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

# 备份原始nginx配置并创建新的配置
RUN cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak

# 创建完整的nginx配置文件
RUN cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    server {
        listen 80;
        server_name localhost;
        root /var/www/html;
        index index.html;

        # 处理前端路由
        location / {
            try_files $uri $uri/ /index.html;
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API代理
        location /api/ {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# 复制后端应用
COPY --from=backend-builder /app/backend /app/backend

# 设置工作目录
WORKDIR /app/backend

# 创建启动脚本
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh

# 启动nginx在后台运行
nginx

# 启动后端应用
cd /app/backend
npm start
EOF

RUN chmod +x /app/start.sh

# 暴露端口
EXPOSE 80 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 启动服务
CMD ["/app/start.sh"]