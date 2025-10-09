@echo off
chcp 65001 >nul
echo ========================================
echo 检查Python环境和依赖
echo ========================================
echo.

echo [1/4] 检查Python版本...
python --version
if %errorlevel% neq 0 (
    echo ❌ Python未安装或未添加到PATH
    pause
    exit /b 1
)
echo.

echo [2/4] 检查必需的Python包...
echo.

echo 检查 mediapipe...
python -c "import mediapipe; print('✅ mediapipe 已安装，版本:', mediapipe.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ mediapipe 未安装
    echo 请运行: pip install mediapipe
)
echo.

echo 检查 opencv-python...
python -c "import cv2; print('✅ opencv-python 已安装，版本:', cv2.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ opencv-python 未安装
    echo 请运行: pip install opencv-python
)
echo.

echo 检查 numpy...
python -c "import numpy; print('✅ numpy 已安装，版本:', numpy.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ numpy 未安装
    echo 请运行: pip install numpy
)
echo.

echo 检查 scikit-learn...
python -c "import sklearn; print('✅ scikit-learn 已安装，版本:', sklearn.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ scikit-learn 未安装
    echo 请运行: pip install scikit-learn
)
echo.

echo 检查 joblib...
python -c "import joblib; print('✅ joblib 已安装，版本:', joblib.__version__)" 2>nul
if %errorlevel% neq 0 (
    echo ❌ joblib 未安装
    echo 请运行: pip install joblib
)
echo.

echo [3/4] 检查AI模型文件...
if exist "server\ml\asl_knn_model.pkl" (
    echo ✅ AI模型文件存在: server\ml\asl_knn_model.pkl
) else (
    echo ❌ AI模型文件不存在！
    echo 请先运行训练脚本: python server\ml\AIModelTrain.py
)
echo.

echo [4/4] 检查Python识别脚本...
if exist "server\ml\realtime_recognition_with_scoring.py" (
    echo ✅ 评分系统脚本存在
) else (
    echo ❌ 评分系统脚本不存在！
)
echo.

echo ========================================
echo 环境检查完成
echo ========================================
echo.
echo 如果所有项都显示 ✅，说明环境配置正确
echo 如果有 ❌，请按照提示安装缺失的组件
echo.
pause

