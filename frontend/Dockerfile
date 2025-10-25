FROM node:18-alpine AS builder

# 安装必要的构建工具
RUN apk add --no-cache git python3 make g++

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
# 使用npm install代替npm ci以避免lockfile严格匹配问题
# 设置npm日志级别为详细，查看更多安装信息
RUN npm config set loglevel verbose
RUN npm install --legacy-peer-deps || (echo "安装依赖失败，尝试清理缓存..." && npm cache clean --force && npm install --legacy-peer-deps)

# 复制源代码
COPY . .

# 运行TypeScript检查并输出详细错误信息
RUN echo "运行TypeScript检查..."
RUN npx tsc --noEmit || (echo "TypeScript检查失败，以下是详细错误信息:" && npx tsc --noEmit --listFiles --diagnostics && exit 1)

# 构建应用
RUN echo "开始构建应用..."
RUN npm run build || (echo "构建失败，查看详细错误信息:" && exit 1)

# 生产环境镜像
FROM nginx:alpine

# 复制构建结果
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
