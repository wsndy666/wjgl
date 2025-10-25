@echo off
echo ========================================
echo 文件管理系统 - 简单测试方案
echo ========================================

echo.
echo 由于网络问题，我们使用以下方案进行测试：
echo 1. 直接使用GitHub上的代码
echo 2. 在群晖NAS上测试
echo 3. 或者等待网络恢复后使用Docker

echo.
echo ========================================
echo 测试步骤：
echo ========================================
echo 1. 将代码推送到GitHub
echo 2. 在群晖NAS上拉取最新代码
echo 3. 使用群晖Docker进行测试

echo.
echo 按任意键继续...
pause > nul

echo.
echo 正在提交代码到GitHub...
git add .
git commit -m "Update README and add local test scripts"
git push origin main

echo.
echo 代码已推送到GitHub！
echo 现在可以在群晖NAS上测试了。
echo.
echo 群晖测试步骤：
echo 1. 进入群晖Docker管理界面
echo 2. 拉取最新镜像：wsndy666/wjgl:latest
echo 3. 运行容器并测试功能
echo.
pause
