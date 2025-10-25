# 本地开发环境设置指南

## 问题说明
sqlite3需要C++编译环境，在Windows上需要Visual Studio构建工具。

## 解决方案

### 方案1：安装Visual Studio构建工具（推荐用于开发）

1. 下载并安装 Visual Studio Build Tools
   - 访问：https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/
   - 下载 "Visual Studio 生成工具 2022"
   - 安装时选择 "C++ 生成工具" 工作负载

2. 重新安装后端依赖
   ```bash
   cd backend
   npm install
   ```

### 方案2：使用Docker进行开发（推荐）

1. 确保Docker Desktop正在运行
2. 使用Docker进行开发和测试
3. 避免本地环境配置问题

### 方案3：使用预构建镜像测试

1. 直接推送到GitHub
2. 在群晖NAS上测试
3. 使用GitHub Actions自动构建

## 推荐流程

1. **开发阶段**：使用Docker进行本地测试
2. **测试阶段**：在群晖NAS上测试
3. **部署阶段**：使用GitHub Actions自动部署

## Docker开发命令

```bash
# 构建镜像
docker build -t wjgl-dev .

# 运行开发容器
docker run -it --rm \
  -p 9999:80 \
  -p 8888:3001 \
  -v %cd%:/app \
  wjgl-dev

# 或者使用docker-compose
docker-compose up --build
```

## 故障排除

### 如果Docker网络有问题：
1. 检查Docker Desktop设置
2. 尝试重启Docker Desktop
3. 检查网络代理设置
4. 使用国内镜像源

### 如果仍然有问题：
1. 直接推送到GitHub
2. 在群晖NAS上测试
3. 使用GitHub Actions自动构建
