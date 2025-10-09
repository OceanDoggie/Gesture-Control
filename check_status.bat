@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════╗
echo ║     AI手势识别系统 - 状态检查        ║
echo ╚════════════════════════════════════════╝
echo.

echo [检查1/3] 项目目录...
if exist "package.json" (
    echo ✅ package.json 存在
) else (
    echo ❌ package.json 不存在
    echo    请确保在正确的目录运行此脚本
    pause
    exit /b 1
)

echo.
echo [检查2/3] 后端服务 (端口5000)...
netstat -ano | findstr ":5000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 后端服务正在运行
) else (
    echo ❌ 后端服务未运行
    echo.
    echo 请启动后端服务:
    echo    npm run backend
)

echo.
echo [检查3/3] 前端服务 (端口5173)...
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 前端服务正在运行
) else (
    echo ❌ 前端服务未运行
    echo.
    echo 请启动前端服务:
    echo    npm run dev
)

echo.
echo ═══════════════════════════════════════════
echo.

netstat -ano | findstr ":5000" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  后端服务未运行 - 这是WebSocket错误的原因！
    echo.
    echo 🔧 快速修复:
    echo    1. 打开新终端
    echo    2. 运行: npm run backend
    echo    3. 等待看到 "serving on port 5000"
    echo    4. 刷新浏览器
    echo.
) else (
    echo ✅ 系统就绪！可以开始测试
    echo.
    echo 🌐 打开浏览器: http://localhost:5173
    echo.
)

pause


