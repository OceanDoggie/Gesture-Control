@echo off
chcp 65001 >nul
echo ================================
echo 手势识别评分系统 - 快速验证
echo ================================
echo.

echo [步骤 1] 检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 未安装或未添加到 PATH
    pause
    exit /b 1
)
echo ✅ Python 已安装

echo.
echo [步骤 2] 检查 Python 依赖...
python -c "import mediapipe, cv2, numpy, joblib" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Python 依赖缺失
    echo 正在安装依赖...
    pip install mediapipe opencv-python numpy joblib scikit-learn
)
echo ✅ Python 依赖完整

echo.
echo [步骤 3] 检查 Node.js 依赖...
if not exist node_modules (
    echo ⚠️  Node 依赖缺失，正在安装...
    npm install
)
echo ✅ Node.js 依赖完整

echo.
echo [步骤 4] 检查新增文件...
if not exist "client\src\hooks\useGestureScore.ts" (
    echo ❌ useGestureScore.ts 未找到
    pause
    exit /b 1
)
echo ✅ useGestureScore.ts 存在

if not exist "client\src\components\WebcamOverlay.tsx" (
    echo ❌ WebcamOverlay.tsx 未找到
    pause
    exit /b 1
)
echo ✅ WebcamOverlay.tsx 存在

echo.
echo ================================
echo ✅ 所有检查通过！
echo ================================
echo.
echo 📋 验证测试清单：
echo.
echo 1. 正确手势维持 1-2 秒
echo    → Live Score 稳定在 ≥75（绿色/橙色）
echo    → Correct Frames 和 Accuracy 上升
echo.
echo 2. 错误手势
echo    → Live Score 降到 <60（红色）
echo    → Accuracy 不上升
echo.
echo 3. 无手状态
echo    → 统计数据不计入
echo.
echo 4. 背光/暗光环境
echo    → 分数下降但不剧烈抖动
echo.
echo 5. WebSocket 断开恢复
echo    → 刷新页面后能正常重连
echo.
echo ================================
echo.
echo 📖 详细说明请查看：评分系统实施说明.md
echo.
pause




