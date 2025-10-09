@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════╗
echo ║     一键安装所有依赖                  ║
echo ╚════════════════════════════════════════╝
echo.

echo [1/3] 安装Python依赖...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pip install -r requirements.txt
echo.

echo [2/3] 安装Node.js依赖...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call npm install
echo.

echo [3/3] 训练AI模型...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if not exist "server\ml\asl_knn_model.pkl" (
    cd server\ml
    python AIModelTrain.py
    cd ..\..
    echo ✅ AI模型训练完成
) else (
    echo ✅ AI模型已存在，跳过训练
)
echo.

echo.
echo ╔════════════════════════════════════════╗
echo ║          🎉 安装完成！                ║
echo ╚════════════════════════════════════════╝
echo.
echo 💡 现在可以运行 RUN_SERVER.bat 启动系统了！
echo.
pause

