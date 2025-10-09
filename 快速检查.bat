@echo off
chcp 65001 >nul
echo.
echo ========================================
echo 🔍 系统状态快速检查
echo ========================================
echo.

echo [1] 检查后端服务 (端口 5000)...
netstat -ano | findstr ":5000" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ 后端服务正在运行
    netstat -ano | findstr ":5000"
) else (
    echo ❌ 后端服务未运行
    echo 请运行: npm run backend
)

echo.
echo [2] 检查前端服务 (端口 5173)...
netstat -ano | findstr ":5173" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ 前端服务正在运行
    netstat -ano | findstr ":5173"
) else (
    echo ❌ 前端服务未运行
    echo 请运行: npm run dev
)

echo.
echo [3] 检查关键文件...
if exist "server\simple_websocket.ts" (
    echo ✅ WebSocket服务文件存在
) else (
    echo ❌ WebSocket服务文件缺失
)

if exist "client\src\components\WebcamViewer.tsx" (
    echo ✅ 前端组件文件存在
) else (
    echo ❌ 前端组件文件缺失
)

if exist "server\ml\asl_knn_model.pkl" (
    echo ✅ AI模型文件存在
) else (
    echo ⚠️ AI模型文件不存在（当前使用模拟数据）
)

echo.
echo ========================================
echo 📋 测试步骤
echo ========================================
echo.
echo 如果两个服务都在运行:
echo   1. 打开浏览器访问: http://localhost:5173/webcam
echo   2. 点击"启动相机"
echo   3. 点击手势按钮 (A/B/C/D/E)
echo   4. 查看摄像头右上角的识别结果
echo.
echo 应该看到:
echo   ✅ 手势字母
echo   ✅ 评分等级 (A/B/C/D)
echo   ✅ 置信度百分比
echo   ✅ 评分说明
echo   ✅ 进度条
echo.
echo ========================================
echo.
pause


