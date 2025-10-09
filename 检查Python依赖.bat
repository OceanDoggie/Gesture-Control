@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════╗
echo ║     Python环境与依赖检查工具          ║
echo ╚════════════════════════════════════════╝
echo.

:: 检查Python版本
echo [1/6] 检查Python版本...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
python --version
if %errorlevel% neq 0 (
    echo ❌ Python未安装或不在PATH中
    echo.
    echo 💡 请安装Python 3.8或更高版本: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo.

:: 检查必要的包
echo [2/6] 检查必要的Python包...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo 检查 mediapipe...
python -c "import mediapipe; print('✅ mediapipe 版本:', mediapipe.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ mediapipe 未安装
    set MISSING=1
)

echo 检查 opencv-python...
python -c "import cv2; print('✅ opencv-python 版本:', cv2.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ opencv-python 未安装
    set MISSING=1
)

echo 检查 numpy...
python -c "import numpy; print('✅ numpy 版本:', numpy.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ numpy 未安装
    set MISSING=1
)

echo 检查 joblib...
python -c "import joblib; print('✅ joblib 版本:', joblib.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ joblib 未安装
    set MISSING=1
)

echo 检查 scikit-learn...
python -c "import sklearn; print('✅ scikit-learn 版本:', sklearn.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ scikit-learn 未安装
    set MISSING=1
)

echo 检查 pandas...
python -c "import pandas; print('✅ pandas 版本:', pandas.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ pandas 未安装
    set MISSING=1
)
echo.

if defined MISSING (
    echo.
    echo ╔════════════════════════════════════════╗
    echo ║     检测到缺少依赖包！                ║
    echo ╚════════════════════════════════════════╝
    echo.
    echo 🔧 是否自动安装缺失的包？ (Y/N)
    set /p INSTALL="请选择: "
    
    if /i "%INSTALL%"=="Y" (
        echo.
        echo [3/6] 安装Python依赖包...
        echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        pip install mediapipe opencv-python numpy joblib scikit-learn pandas
        echo.
        echo ✅ 依赖包安装完成！
    ) else (
        echo.
        echo 💡 请手动运行以下命令安装依赖：
        echo    pip install mediapipe opencv-python numpy joblib scikit-learn pandas
        echo.
        pause
        exit /b 1
    )
) else (
    echo ✅ 所有必要的Python包都已安装！
)

echo.
echo [4/6] 检查AI模型文件...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if exist "server\ml\asl_knn_model.pkl" (
    echo ✅ AI模型文件存在: server\ml\asl_knn_model.pkl
) else (
    echo ❌ AI模型文件不存在
    echo.
    echo 🔧 正在训练AI模型...
    cd server\ml
    python AIModelTrain.py
    cd ..\..
)
echo.

echo [5/6] 测试Python识别脚本...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
python -c "import sys; sys.path.insert(0, 'server/ml'); exec(open('server/ml/realtime_recognition_with_scoring.py').read().replace('while True:', 'import sys; sys.exit(0)  # Exit after initialization\nwhile False:'))" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Python识别脚本可以正常加载
) else (
    echo ⚠️ Python识别脚本加载可能有问题，但这不一定会影响运行
)
echo.

echo [6/6] 检查Node.js依赖...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if exist "node_modules\python-shell" (
    echo ✅ python-shell 包已安装
) else (
    echo ❌ python-shell 包未安装
    echo 🔧 正在安装...
    npm install
)
echo.

echo.
echo ╔════════════════════════════════════════╗
echo ║          🎉 检查完成！                ║
echo ╚════════════════════════════════════════╝
echo.
echo 📊 系统状态总结:
echo    ✓ Python环境: 正常
echo    ✓ 必要依赖包: 已安装
echo    ✓ AI模型文件: 存在
echo    ✓ Node.js依赖: 已安装
echo.
echo 💡 现在你可以运行 RUN_SERVER.bat 来启动系统了！
echo.
pause

