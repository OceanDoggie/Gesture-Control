@echo off
echo 🚀 启动AI手势识别系统...
echo.

echo 📦 检查依赖...
if not exist "node_modules" (
    echo 安装Node.js依赖...
    npm install
)

echo.
echo 🧠 训练AI模型...
cd server\ml
python train_model.py
if %errorlevel% neq 0 (
    echo ❌ 模型训练失败，请检查Python环境
    pause
    exit /b 1
)

echo.
echo ✅ 模型训练完成！
echo.
echo 🎯 启动后端服务...
cd ..\..
start "AI后端服务" cmd /k "npm run backend"

echo.
echo ⏳ 等待后端服务启动...
timeout /t 3 /nobreak >nul

echo.
echo 🌐 启动前端服务...
start "AI前端服务" cmd /k "npm run dev"

echo.
echo 🎉 AI手势识别系统已启动！
echo.
echo 📱 前端地址: http://localhost:5173
echo 🔧 后端地址: http://localhost:5000
echo.
echo 💡 使用说明:
echo 1. 打开浏览器访问前端地址
echo 2. 点击"Webcam"菜单
echo 3. 点击"启动相机"
echo 4. 选择要练习的手势
echo 5. 开始AI手势识别！
echo.
pause

