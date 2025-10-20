@echo off
chcp 65001 >nul
echo ========================================
echo   修复白屏 - 清理并重启开发服务器
echo ========================================
echo.

echo [1/4] 停止所有 Node 进程...
taskkill /F /IM node.exe 2>nul
if %errorlevel%==0 (
    echo ✅ Node 进程已停止
) else (
    echo ℹ️  没有运行中的 Node 进程
)
echo.

echo [2/4] 清理 Vite 缓存...
if exist "node_modules\.vite" (
    rmdir /S /Q "node_modules\.vite" 2>nul
    echo ✅ Vite 缓存已清理
) else (
    echo ℹ️  Vite 缓存目录不存在
)
echo.

echo [3/4] 等待端口释放 (2 秒)...
timeout /t 2 /nobreak >nul
echo ✅ 端口已释放
echo.

echo [4/4] 启动开发服务器...
echo.
echo ========================================
echo   服务器启动中...
echo   - Vite (前端): http://localhost:5173
echo   - Express (后端): http://localhost:4000
echo ========================================
echo.
echo 💡 提示:
echo   - 等待 "[client]" 和 "[server]" 都显示成功后
echo   - 打开浏览器访问 http://localhost:5173
echo   - 按 Ctrl+Shift+R 强制刷新页面
echo   - 按 D 键打开 Debug 面板
echo.
echo ⚠️  注意: 不要关闭此窗口！
echo.

npm run dev


