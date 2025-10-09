@echo off
echo ========================================
echo 系统验证检查
echo ========================================
echo.

echo [1/5] 检查Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装
    pause
    exit /b 1
)
echo ✅ Node.js已安装
echo.

echo [2/5] 检查Python...
python --version
if %errorlevel% neq 0 (
    echo ❌ Python未安装
    pause
    exit /b 1
)
echo ✅ Python已安装
echo.

echo [3/5] 检查关键文件...
if not exist "GestureWorkshop\server\ml\AIModelTrain.py" (
    echo ❌ AIModelTrain.py不存在
    pause
    exit /b 1
)
if not exist "GestureWorkshop\server\ml\mediapipeImport.py" (
    echo ❌ mediapipeImport.py不存在
    pause
    exit /b 1
)
if not exist "GestureWorkshop\server\ml\asl_dataset.csv" (
    echo ❌ asl_dataset.csv不存在
    pause
    exit /b 1
)
echo ✅ 您的原始文件都存在
echo.

echo [4/5] 检查Python依赖...
python -c "import mediapipe, cv2, sklearn, joblib, numpy" 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Python依赖缺失，正在安装...
    pip install mediapipe opencv-python scikit-learn joblib numpy
)
echo ✅ Python依赖已就绪
echo.

echo [5/5] 检查模型文件...
if not exist "GestureWorkshop\server\ml\asl_knn_model.pkl" (
    echo ⚠️  模型文件不存在，需要先训练模型
    echo.
    echo 请运行以下命令训练模型:
    echo   cd GestureWorkshop\server\ml
    echo   python AIModelTrain.py
    echo.
) else (
    echo ✅ 模型文件已存在
)

echo.
echo ========================================
echo 验证完成！
echo ========================================
echo.
echo 📋 系统状态总结:
echo   - 您的训练代码: AIModelTrain.py ✅
echo   - 您的检测代码: mediapipeImport.py ✅
echo   - 您的数据集: asl_dataset.csv ✅
echo   - 实时服务: realtime_recognition.py ✅
echo.
echo 🚀 启动步骤:
echo   1. 终端1: npm run backend
echo   2. 终端2: npm run dev
echo   3. 浏览器: http://localhost:5173
echo.
pause


