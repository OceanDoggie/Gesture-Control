# 快速验证指南 - 评分系统修复

## 🚀 快速启动

### 1. 确保 Python 依赖已安装
```bash
pip install mediapipe opencv-python numpy joblib scikit-learn
```

### 2. 启动项目
```bash
cd GestureWorkshop
npm run dev
```

## ✅ 验收检查清单

### 检查点 1：后端启动日志 ✓
打开终端，查看后端启动日志：

**✅ 正确（应该看到）：**
```
✅ Python gesture service started
🐍 ✅ 带评分系统的手势识别服务已启动
📡 WebSocket Endpoints:
   • Gesture Recognition: ws://localhost:4000/ws/gesture
```

**❌ 错误（不应该看到）：**
```
⚠️ Python worker disabled (PY_WORKER_ENABLED=false)
```

---

### 检查点 2：WebSocket 连接 ✓
1. 打开浏览器：`http://localhost:5173/webcam`
2. 打开 DevTools → Console

**✅ 正确（应该看到）：**
```
[Config] WebSocket URL: ws://localhost:4000/ws/gesture
[WS] Connecting to: ws://localhost:4000/ws/gesture
[WS] ✅ Connected to backend
```

---

### 检查点 3：识别流程 ✓

#### 3.1 打开摄像头
1. 点击 "Start Camera" 按钮
2. 允许摄像头权限

**✅ 正确（Console 应该看到）：**
```
Camera started
Camera started successfully (640x480@20-24fps)
✅ MediaPipe HandLandmarker 初始化完成
```

#### 3.2 开始识别
1. 选择一个字母（如 "A"）
2. 点击 "Start Recognition" ▶️ 按钮

**✅ 正确（Console 应该看到）：**
```
[WS] Starting recognition for gesture: A
🎯 Recognition started
```

#### 3.3 做出手势
伸出手，做出 ASL 字母 "A" 的手势

**✅ 正确（Console 应该看到，每 3 秒一次）：**
```
[WS] sending frame (320x240, ~15.2KB)
```

**✅ 正确（Console 应该看到，每约 1.5 秒一次）：**
```
[WS] score: 85% predicted: A hands: Y
[WS] score: 82% predicted: A hands: Y
[WS] score: 91% predicted: A hands: Y
```

---

### 检查点 4：UI 更新 ✓

#### 4.1 Live Score 徽标（右上角）
- **✅ 应该显示**：实时变化的分数（0-100）
- **❌ 不应该显示**：始终为 0

#### 4.2 进度条（WebcamOverlay）
- **✅ 应该显示**：随手势质量变化的绿色进度条
- **✅ 应该显示**：当 score > 80 时为绿色，50-80 为黄色，< 50 为红色

#### 4.3 统计面板（右上角）
- **Total Frames**：应该持续递增
- **Correct Frames**：当你的手势正确时递增
- **Accuracy**：动态计算并显示（Correct / Total * 100%）

---

### 检查点 5：Network 面板 ✓
1. DevTools → Network → WS
2. 选择 `/ws/gesture` 连接
3. 点击 "Frames" 面板

**✅ 正确（应该看到）：**
- **发送的消息**（绿色，向上箭头）：
  ```json
  {"type":"start_recognition","target_gesture":"A"}
  {"type":"frame_data","frame":"<base64...>"}
  {"type":"frame_data","frame":"<base64...>"}
  ...
  ```

- **接收的消息**（白色，向下箭头）：
  ```json
  {"ok":true,"data":{"type":"gesture_result","hands_detected":true,"predicted":"A","confidence":0.85,...}}
  {"ok":true,"data":{"type":"gesture_result","hands_detected":true,"predicted":"A","confidence":0.82,...}}
  ...
  ```

---

## 🐛 常见问题排查

### 问题 1：后端显示 "Python worker disabled"
**解决方案**：
1. 检查 `package.json` 中的 `dev:server` 命令是否包含 `PY_WORKER_ENABLED=true`
2. 重启后端：`Ctrl+C` → `npm run dev`

### 问题 2：Live Score 仍然为 0
**排查步骤**：
1. 检查 Console 是否有 `[WS] score: ...` 日志 → 如果没有，说明后端没有返回数据
2. 检查 Network → WS → Frames → 是否有 `gesture_result` 消息 → 如果没有，说明 Python worker 未启动
3. 检查后端日志 → 是否有 Python 错误

### 问题 3：无法连接到 WebSocket
**排查步骤**：
1. 检查后端是否启动：访问 `http://localhost:4000/healthz`（应该返回 "ok"）
2. 检查端口是否被占用：`netstat -ano | findstr :4000`
3. 检查防火墙设置

### 问题 4：Python 依赖缺失
**错误日志**：
```
ModuleNotFoundError: No module named 'mediapipe'
```

**解决方案**：
```bash
pip install mediapipe opencv-python numpy joblib scikit-learn
```

---

## 📊 性能指标参考

### 正常运行指标
- **发送帧率**：20 fps（每 50ms 一帧）
- **接收评分频率**：~15-20 msg/s（取决于 Python 处理速度）
- **推理耗时**：10-30ms（取决于机器性能）
- **网络延迟**：< 50ms（本地）
- **Live Score 更新频率**：实时（每收到一条消息更新一次）

### 异常指标
- 发送帧率 < 10 fps → 可能是摄像头或浏览器性能问题
- 接收评分频率 < 5 msg/s → 可能是 Python 处理过慢
- 推理耗时 > 100ms → 可能是模型加载失败或机器性能不足

---

## 🎯 手动提交命令（可选）

如果需要手动提交代码：

```bash
# 添加修改的文件
git add client/src/components/WebcamViewer.tsx
git add package.json

# 提交
git commit -m "fix: wire landmarks -> WS -> scoring -> UI (local env enables python worker)

- 启用本地 Python worker（PY_WORKER_ENABLED=true）
- 添加 WebSocket 发送/接收评分日志（限频打印）
- 保持现有协议和 UI 不变，仅增强可观测性

验收通过：
- 后端启动无 'Python worker disabled' 警告
- DevTools 可见 WS 发送/接收日志
- Live Score 随手势实时更新（非 0）"

# 推送（如需）
git push origin fix/scoring-pipeline-ws
```

---

## 📸 验收截图建议

建议截取以下截图作为验收证明：

1. **后端启动日志**：显示 "✅ Python gesture service started"
2. **浏览器 Console**：显示 `[WS] score: ...` 日志
3. **Network → WS → Frames**：显示发送和接收的消息
4. **UI 截图**：显示 Live Score 非 0，进度条有变化
5. **统计面板**：显示 Total Frames 和 Correct Frames 递增

---

## ✨ 完成！

如果所有检查点都通过，说明修复成功！🎉

如有问题，请查看：
- 详细说明：`SCORING_FIX_SUMMARY.md`
- 后端日志：查看终端输出
- 前端日志：DevTools → Console

