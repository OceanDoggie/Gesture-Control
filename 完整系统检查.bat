@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════╗
echo ║     AI手势识别系统 - 完整检查                ║
echo ╚════════════════════════════════════════════════╝
echo.

set PASSED=0
set TOTAL=8

:: 测试1: Python版本
echo [1/8] 检查Python版本...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
python --version >nul 2>&1
if %errorlevel% equ 0 (
    python --version
    echo ✅ Python已安装
    set /a PASSED+=1
) else (
    echo ❌ Python未安装
)
echo.

:: 测试2: Python依赖
echo [2/8] 检查Python依赖包...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
python -c "import mediapipe, cv2, numpy, joblib, sklearn, pandas; print('✅ 所有Python依赖已安装')" 2>nul
if %errorlevel% equ 0 (
    set /a PASSED+=1
) else (
    echo ❌ Python依赖缺失
    echo    运行: 一键安装依赖.bat
)
echo.

:: 测试3: AI模型文件
echo [3/8] 检查AI模型文件...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if exist "server\ml\asl_knn_model.pkl" (
    echo ✅ AI模型文件存在
    set /a PASSED+=1
) else (
    echo ❌ AI模型文件不存在
    echo    运行: cd server\ml ^&^& python AIModelTrain.py
)
echo.

:: 测试4: Python脚本
echo [4/8] 测试Python识别脚本...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if exist "test_python_script.py" (
    python test_python_script.py >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Python脚本可以正常运行
        set /a PASSED+=1
    ) else (
        echo ❌ Python脚本运行失败
    )
) else (
    echo ⚠️  测试脚本不存在，跳过
    set /a PASSED+=1
)
echo.

:: 测试5: Node.js
echo [5/8] 检查Node.js...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
node --version >nul 2>&1
if %errorlevel% equ 0 (
    node --version
    echo ✅ Node.js已安装
    set /a PASSED+=1
) else (
    echo ❌ Node.js未安装
)
echo.

:: 测试6: Node依赖
echo [6/8] 检查Node.js依赖...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if exist "node_modules" (
    if exist "node_modules\python-shell" (
        echo ✅ Node.js依赖已安装（包含python-shell）
        set /a PASSED+=1
    ) else (
        echo ⚠️  python-shell包缺失
        echo    运行: npm install
    )
) else (
    echo ❌ node_modules不存在
    echo    运行: npm install
)
echo.

:: 测试7: 项目文件结构
echo [7/8] 检查项目文件结构...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set FILES_OK=1
if not exist "server\index.ts" set FILES_OK=0
if not exist "server\websocket_service.ts" set FILES_OK=0
if not exist "server\ml\realtime_recognition_with_scoring.py" set FILES_OK=0
if not exist "client\src\components\WebcamViewer.tsx" set FILES_OK=0

if %FILES_OK% equ 1 (
    echo ✅ 关键文件都存在
    set /a PASSED+=1
) else (
    echo ❌ 某些关键文件缺失
)
echo.

:: 测试8: 端口检查
echo [8/8] 检查端口4000是否可用...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
netstat -ano | findstr :4000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  端口4000已被占用
    echo    如果不是本项目使用，请关闭占用进程
) else (
    echo ✅ 端口4000可用
    set /a PASSED+=1
)
echo.

:: 总结
echo.
echo ╔════════════════════════════════════════════════╗
echo ║              检查结果                         ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 通过测试: %PASSED%/%TOTAL%
echo.

if %PASSED% equ %TOTAL% (
    echo ✅✅✅ 所有检查通过！系统已准备就绪！
    echo.
    echo 📝 下一步操作：
    echo    1. 运行 RUN_SERVER.bat 启动服务器
    echo    2. 打开浏览器访问 http://localhost:4000
    echo    3. 点击 Webcam 菜单开始使用！
) else (
    echo ⚠️  某些检查未通过，请查看上方详情
    echo.
    echo 💡 常见解决方案：
    echo    • 缺少Python依赖: 运行 一键安装依赖.bat
    echo    • 缺少Node依赖: 运行 npm install
    echo    • 缺少AI模型: 会在首次启动时自动训练
)

echo.
echo 详细说明请查看: 启动和测试指南.md
echo.
pause

