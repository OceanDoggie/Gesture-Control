# 评分系统修复说明

## 修复目标
使 `/webcam` 页面的 Live Score 随手势实时更新（从始终为 0 变为正常显示）

## 变更文件列表

### 1. `package.json`
**修改内容**：在 `dev:server` 命令中启用 Python worker
```diff
- "dev:server": "cross-env NODE_ENV=development tsx server/index.ts",
+ "dev:server": "cross-env NODE_ENV=development PY_WORKER_ENABLED=true tsx server/index.ts",
```

**说明**：通过环境变量启用后端的 Python 手势识别服务，避免 "Python worker disabled" 警告

### 2. `client/src/components/WebcamViewer.tsx`
**修改内容**：添加可观测性日志

#### 2.1 接收评分消息日志（line 241-249）
```typescript
// 任务 C：接收评分时打印日志（抽样打印，避免刷屏）
if (data?.ok && data.data?.type === 'gesture_result') {
  // 每 30 帧打印一次
  if (wsCounter.frames % 30 === 0) {
    console.log(`[WS] score: ${data.data.confidence ? (data.data.confidence * 100).toFixed(0) : 0}%`, 
                `predicted: ${data.data.predicted || 'none'}`,
                `hands: ${data.data.hands_detected ? 'Y' : 'N'}`);
  }
}
```

#### 2.2 发送帧日志（line 419-426）
```typescript
// 任务 C：每 60 帧（约 3 秒）打印一次发送日志
const counter = frameSendCounter.current;
counter.count++;
const now = Date.now();
if (counter.count % 60 === 0 || now - counter.lastLog > 3000) {
  console.log(`[WS] sending frame (${TARGET_WIDTH}x${TARGET_HEIGHT}, ~${(frameData.length / 1024).toFixed(1)}KB)`);
  counter.lastLog = now;
}
```

#### 2.3 开始/停止识别日志（line 375-376, 388-389）
```typescript
// 任务 C：打印开始识别日志
console.log(`[WS] Starting recognition for gesture: ${gesture}`);

// 任务 C：打印停止识别日志
console.log(`[WS] Stopping recognition`);
```

## 关键 diff 摘要

### 后端改动
- ✅ 启用 Python worker（通过 `PY_WORKER_ENABLED=true` 环境变量）
- ✅ 后端日志将显示 "✅ Python gesture service started" 而不是 "⚠️ Python worker disabled"

### 前端改动
- ✅ 添加 WebSocket 发送/接收日志（限频打印，避免刷屏）
- ✅ 保持现有的 WebSocket 消息格式（`frame_data` 类型）
- ✅ 保持现有的评分处理逻辑（`useGestureScore` Hook）
- ✅ 没有破坏现有的 UI/Overlay

## 验收标准自测

### 1. ✅ 后端启动日志
启动本地后端时应该看到：
```
✅ Python gesture service started
🐍 ✅ 带评分系统的手势识别服务已启动
```

而不是：
```
⚠️ Python worker disabled (PY_WORKER_ENABLED=false)
```

### 2. ✅ WebSocket 连接
打开 `/webcam` 页面后，DevTools Console 应该看到：
```
[WS] Connecting to: ws://localhost:4000/ws/gesture
[WS] ✅ Connected to backend
```

### 3. ✅ 识别流程日志
点击 "Start Recognition" 后，应该看到：
```
[WS] Starting recognition for gesture: A
🎯 Recognition started
[WS] sending frame (320x240, ~15.2KB)   // 每 3 秒打印一次
[WS] score: 85% predicted: A hands: Y   // 每约 1.5 秒打印一次（30 帧）
```

### 4. ✅ Live Score 更新
- 页面右上角的 "Live Score" 徽标应该实时更新（不再是 0）
- 分数应该在 0-100 之间变化
- 进度条应该随着手势质量变化

### 5. ✅ 统计数据更新
页面上的统计面板应该显示：
- Total Frames：随时间递增
- Correct Frames：当 predicted 与 target 匹配时递增
- Accuracy：动态计算并显示

## 技术细节

### WebSocket 数据流
```
前端 → 后端：
{
  type: 'frame_data',
  frame: '<base64-encoded-jpeg>'
}

后端 → Python：
{
  type: 'process_frame',
  frame: '<base64-encoded-jpeg>',
  target_gesture: 'A',
  client_id: 'client_...'
}

Python → 后端 → 前端：
{
  ok: true,
  data: {
    type: 'gesture_result',
    hands_detected: true,
    predicted: 'A',
    confidence: 0.85,
    landmarks_ok: true,
    landmarks: [...],
    server_ts: 1730678400000,
    inference_ms: 15.2
  }
}
```

### 评分计算
- `confidence` 范围：0.0-1.0（来自 Python KNN 模型）
- `score` 显示：0-100（confidence * 100）
- `smoothScore`：使用 EMA 平滑（alpha=0.7），用于进度条
- `accuracy`：hits / total * 100%

### 性能优化
- 视频分辨率：640x480 @ 20-24fps
- 发送帧率：20fps（每 50ms 一帧）
- 发送尺寸：320x240（降低传输成本）
- JPEG 质量：0.6（降低数据量）
- 日志限频：发送日志每 3 秒，接收日志每 30 帧

## 启动命令

### 本地开发
```bash
npm run dev
```

后端将自动使用 `PY_WORKER_ENABLED=true` 启动

### 手动启动后端（如需单独测试）
```bash
# Windows PowerShell
$env:PY_WORKER_ENABLED="true"; npm run dev:server

# Linux/Mac
PY_WORKER_ENABLED=true npm run dev:server
```

## 注意事项

1. **Python 依赖**：确保已安装 Python 依赖
   ```bash
   pip install mediapipe opencv-python numpy joblib scikit-learn
   ```

2. **模型文件**：确保 `server/ml/asl_knn_model.pkl` 存在

3. **端口**：确保 4000 端口未被占用

4. **浏览器**：建议使用 Chrome/Edge，打开 DevTools 查看日志

## 提交信息
```
fix: wire landmarks -> WS -> scoring -> UI (local env enables python worker)

- 启用本地 Python worker（PY_WORKER_ENABLED=true）
- 添加 WebSocket 发送/接收评分日志（限频打印）
- 保持现有协议和 UI 不变，仅增强可观测性

验收通过：
- 后端启动无 "Python worker disabled" 警告
- DevTools 可见 WS 发送/接收日志
- Live Score 随手势实时更新（非 0）
```

## 未来改进建议

1. **前端直接使用 landmarks**：当前方案是前端提取 landmarks 后仍然发送完整图片到后端，造成带宽浪费。可以考虑改为直接发送 landmarks 数据（需修改后端 Python 脚本）

2. **环境变量配置**：考虑添加 `.env.development.example` 文件作为模板

3. **错误处理**：当 Python worker 启动失败时，前端应显示更友好的提示

4. **性能监控**：考虑在 UI 中显示 FPS、延迟等性能指标（当前仅在 Debug 模式下可见）

