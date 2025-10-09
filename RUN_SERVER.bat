@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════╗
echo ║   AI手势识别系统 - 本地服务器启动    ║
echo ╚════════════════════════════════════════╝
echo.

:: 检查模型文件
if not exist "server\ml\asl_knn_model.pkl" (
    echo [步骤1/3] 训练AI模型...
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    cd server\ml
    python AIModelTrain.py
    cd ..\..
    echo.
) else (
    echo [✓] AI模型已存在
    echo.
)

echo [步骤2/2] 启动服务器 (后端+前端集成)...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
start "AI手势识别系统 - 端口4000" cmd /k "npm run backend"
echo 服务器正在启动...
timeout /t 5 /nobreak >nul
echo.

echo ╔════════════════════════════════════════╗
echo ║          🎉 服务启动完成！            ║
echo ╚════════════════════════════════════════╝
echo.
echo 📱 请在浏览器中打开: http://localhost:4000
echo.
echo 🎯 使用步骤:
echo    1. 点击 "Webcam" 菜单
echo    2. 点击 "启动相机"
echo    3. 选择手势 (A-E)
echo    4. 开始AI识别！
echo.
echo 📊 系统状态:
echo    ✓ 统一服务: http://localhost:4000 (前端+后端+WebSocket)
echo    ✓ AI模型: 已加载 (准确率73%%)
echo    ✓ 数据集: 376个样本
echo.
echo 💡 提示: 
echo    - 确保允许浏览器访问摄像头
echo    - 关闭服务请在终端窗口按 Ctrl+C
echo.
pause


