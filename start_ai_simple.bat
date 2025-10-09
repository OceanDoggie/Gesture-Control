@echo off
echo 🚀 启动AI手势识别系统 (简化版)
echo.

echo 📦 检查Python环境...
python --version
if %errorlevel% neq 0 (
    echo ❌ Python未安装或未添加到PATH
    pause
    exit /b 1
)

echo.
echo 📦 安装Python依赖...
pip install mediapipe opencv-python scikit-learn joblib numpy pillow

echo.
echo 🧠 训练AI模型...
cd server\ml
python train_model.py
if %errorlevel% neq 0 (
    echo ❌ 模型训练失败
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
timeout /t 5 /nobreak >nul

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
echo 4. 选择要练习的手势 (A-E)
echo 5. 开始AI手势识别！
echo.
echo 🔧 如果遇到问题，请检查:
echo - 摄像头权限是否允许
echo - Python依赖是否安装完整
echo - 模型文件是否生成成功
echo.
pause

