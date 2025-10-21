#!/bin/bash

# 上传项目到GitHub仓库 wjgl
# 并配置Docker Hub自动同步

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

# 检查Git
check_git() {
    log_info "检查Git环境..."
    
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
    
    # 检查Git配置
    if ! git config --global user.name &> /dev/null; then
        log_warning "Git用户名未配置"
        echo -n "请输入Git用户名: "
        read -r git_username
        git config --global user.name "$git_username"
    fi
    
    if ! git config --global user.email &> /dev/null; then
        log_warning "Git邮箱未配置"
        echo -n "请输入Git邮箱: "
        read -r git_email
        git config --global user.email "$git_email"
    fi
    
    log_success "Git环境检查通过"
}

# 初始化Git仓库
init_git_repo() {
    log_info "初始化Git仓库..."
    
    # 检查是否已经是Git仓库
    if [ -d ".git" ]; then
        log_info "Git仓库已存在"
    else
        git init
        log_success "Git仓库初始化完成"
    fi
}

# 创建.gitignore文件
create_gitignore() {
    log_info "创建.gitignore文件..."
    
    cat > .gitignore <<EOF
# 依赖文件
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 环境变量
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 数据文件
data/
logs/
*.log

# 临时文件
.DS_Store
Thumbs.db
*.tmp
*.temp

# IDE文件
.vscode/
.idea/
*.swp
*.swo

# Docker相关
.dockerignore

# 备份文件
*.backup
*.bak

# SSL证书
ssl/
*.pem
*.key
*.crt

# 监控数据
monitoring/prometheus_data/
monitoring/grafana_data/
EOF
    
    log_success ".gitignore文件创建完成"
}

# 添加文件到Git
add_files() {
    log_info "添加文件到Git..."
    
    # 添加所有文件
    git add .
    
    # 检查是否有文件需要提交
    if git diff --cached --quiet; then
        log_warning "没有文件需要提交"
        return 0
    fi
    
    log_success "文件添加完成"
}

# 提交代码
commit_code() {
    log_info "提交代码..."
    
    git commit -m "Initial commit: 文件管理系统 wjgl

- 基于Docker的文件管理系统
- 支持飞牛NAS、群晖等系统
- 包含前端、后端、Nginx服务
- 支持Docker Hub自动构建
- 配置GitHub Actions CI/CD"
    
    log_success "代码提交完成"
}

# 添加远程仓库
add_remote() {
    log_info "配置远程仓库..."
    
    # 检查是否已有远程仓库
    if git remote get-url origin &> /dev/null; then
        log_info "远程仓库已配置: $(git remote get-url origin)"
    else
        echo -n "请输入GitHub仓库URL (https://github.com/wsndy666/wjgl.git): "
        read -r repo_url
        
        if [ -z "$repo_url" ]; then
            repo_url="https://github.com/wsndy666/wjgl.git"
            log_warning "使用默认仓库URL: $repo_url"
        fi
        
        git remote add origin "$repo_url"
        log_success "远程仓库配置完成: $repo_url"
    fi
}

# 推送到GitHub
push_to_github() {
    log_info "推送到GitHub..."
    
    # 设置默认分支为main
    git branch -M main
    
    # 推送到GitHub
    git push -u origin main
    
    log_success "代码已推送到GitHub"
}

# 显示后续步骤
show_next_steps() {
    log_success "GitHub上传完成！"
    echo ""
    echo "后续步骤："
    echo "1. 在GitHub仓库中配置Secrets："
    echo "   - 进入仓库 Settings → Secrets and variables → Actions"
    echo "   - 添加 DOCKER_USERNAME: 你的Docker Hub用户名"
    echo "   - 添加 DOCKER_PASSWORD: 你的Docker Hub访问令牌"
    echo ""
    echo "2. 在Docker Hub创建仓库："
    echo "   - 创建仓库: wjgl-backend"
    echo "   - 创建仓库: wjgl-frontend"
    echo ""
    echo "3. 验证自动构建："
    echo "   - 查看GitHub Actions是否正常运行"
    echo "   - 检查Docker Hub是否有新镜像"
    echo ""
    echo "4. 部署到飞牛NAS："
    echo "   - 使用 docker-compose.hub.yml 配置"
    echo "   - 运行 deploy-from-hub.sh 脚本"
    echo ""
}

# 主函数
main() {
    echo "上传项目到GitHub仓库 wjgl"
    echo "=========================="
    echo ""
    
    case "${1:-upload}" in
        "upload")
            check_git
            init_git_repo
            create_gitignore
            add_files
            commit_code
            add_remote
            push_to_github
            show_next_steps
            ;;
        "status")
            git status
            ;;
        "log")
            git log --oneline -10
            ;;
        "remote")
            git remote -v
            ;;
        *)
            echo "用法: $0 {upload|status|log|remote}"
            echo ""
            echo "命令说明："
            echo "  upload  - 上传到GitHub（默认）"
            echo "  status  - 查看Git状态"
            echo "  log     - 查看提交历史"
            echo "  remote  - 查看远程仓库"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
