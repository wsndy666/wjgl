# 飞牛NAS文件管理系统部署指南

## 问题解决

### 1. 修复Docker Compose警告
已移除过时的`version`字段，使用最新的Docker Compose格式。

### 2. 项目名称问题
飞牛NAS中项目名称不能为空，已通过环境变量设置。

## 快速部署步骤

### 方法一：使用部署脚本（推荐）

```bash
# 1. 进入项目目录
cd /vol2/docker/文件管理

# 2. 运行部署脚本
chmod +x deploy-fn.sh
./deploy-fn.sh
```

### 方法二：手动部署

```bash
# 1. 设置项目名称
export COMPOSE_PROJECT_NAME=file-management

# 2. 创建环境配置
cp env.example .env

# 3. 创建必要目录
mkdir -p data/uploads data/logs logs

# 4. 启动服务
docker-compose up -d
```

## 飞牛NAS特殊配置

### 1. 端口映射
在飞牛NAS的Docker应用中，需要配置以下端口映射：
- 80 → 80 (HTTP)
- 443 → 443 (HTTPS，可选)

### 2. 数据持久化
确保以下目录映射到飞牛NAS的存储卷：
- `./data` → `/vol2/docker/文件管理/data`
- `./logs` → `/vol2/docker/文件管理/logs`

### 3. 网络配置
使用飞牛NAS的默认网络，确保容器间可以通信。

## 访问系统

部署完成后，通过以下地址访问：
- **前端界面**: http://你的飞牛NAS IP
- **API接口**: http://你的飞牛NAS IP/api
- **健康检查**: http://你的飞牛NAS IP/api/health

## 默认账户

- **用户名**: admin
- **密码**: admin123

## 管理命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新服务
docker-compose pull && docker-compose up -d
```

## 故障排除

### 1. 服务启动失败
```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :3001
```

### 2. 文件上传失败
检查目录权限：
```bash
chmod 755 data/uploads
chown -R 1000:1000 data/uploads
```

### 3. 数据库问题
```bash
# 重新初始化数据库
docker-compose exec backend npm run init-db
```

## 性能优化

### 1. 飞牛NAS资源限制
- 建议分配至少2GB内存
- 确保有足够的存储空间（建议10GB以上）

### 2. 网络优化
- 使用有线网络连接
- 确保飞牛NAS网络稳定

## 备份与恢复

### 备份数据
```bash
# 备份数据库
cp data/database.sqlite backup/database-$(date +%Y%m%d).sqlite

# 备份上传文件
tar -czf backup/uploads-$(date +%Y%m%d).tar.gz data/uploads
```

### 恢复数据
```bash
# 恢复数据库
cp backup/database-YYYYMMDD.sqlite data/database.sqlite

# 恢复上传文件
tar -xzf backup/uploads-YYYYMMDD.tar.gz -C data/
```

## 安全建议

1. **修改默认密码**：首次登录后立即修改admin密码
2. **定期备份**：设置自动备份任务
3. **更新系统**：定期更新Docker镜像
4. **监控日志**：定期检查系统日志

## 技术支持

如遇到问题，请检查：
1. 飞牛NAS系统版本是否支持Docker
2. 网络连接是否正常
3. 存储空间是否充足
4. 端口是否被占用

更多帮助请参考项目README.md文件。
