@echo off
chcp 65001 >nul
echo.
echo ========================================
echo 🚀 启动手势识别系统
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 停止旧进程...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/2] 启动服务器 (后端+前端集成)...
start "手势识别系统" cmd /k "npm run backend"

echo.
echo 等待服务器启动 (5秒)...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo ✅ 服务已启动！
echo ========================================
echo.
echo 📌 系统地址: http://localhost:4000
echo.
echo 🌐 请在浏览器访问: http://localhost:4000/webcam
echo.
echo 测试步骤:
echo   1. 点击"启动相机"
echo   2. 点击手势按钮 (A/B/C/D/E)
echo   3. 对着摄像头做手势
echo   4. 查看右上角的AI识别结果和评分
echo.
echo ========================================
pause


