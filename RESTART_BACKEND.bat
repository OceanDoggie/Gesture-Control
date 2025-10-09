@echo off
echo ===================================
echo 清理并重启后端服务
echo ===================================

cd /d "%~dp0"

echo.
echo [1/3] 停止所有 Node 进程...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/3] 清理缓存...
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist .vite rmdir /s /q .vite

echo.
echo [3/3] 启动后端服务...
echo.
start "GestureWorkshop后端" cmd /k "npm run backend"

echo.
echo ===================================
echo 后端服务已在新窗口启动！
echo 等待5秒后启动前端...
echo ===================================
timeout /t 5 /nobreak >nul

echo.
echo 启动前端服务...
start "GestureWorkshop前端" cmd /k "npm run dev"

echo.
echo ===================================
echo 所有服务已启动！
echo 
echo 后端: http://localhost:5000
echo 前端: http://localhost:5173
echo 
echo 请等待服务完全启动（约10-15秒）
echo ===================================
pause


