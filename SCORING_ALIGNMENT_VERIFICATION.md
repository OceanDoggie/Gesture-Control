# 评分链路对齐 - 验收指南

## 变更概述

本次改动实现了**最小改动 + 零风险部署**的评分链路对齐，目标是让 Live Score 随手势稳定提升，预处理与训练数据一致。

### 变更文件清单

#### 前端（3 个文件）
1. `client/src/components/WebcamViewer.tsx` - 发送 landmarks 时增加镜像/单位上下文
2. `client/src/components/WebcamOverlay.tsx` - 显示预测类别 & 置信度
3. `client/src/hooks/useGestureScore.ts` - 增加 confidence 状态

#### 后端（2 个文件）
1. `server/websocket_service.ts` - 处理 landmarks 消息类型
2. `server/ml/realtime_recognition.py` - 预处理容错 & 对齐

### 核心改动

#### 1. 前端发送镜像/单位上下文

**文件**: `client/src/components/WebcamViewer.tsx`

**改动**: 在 `useMediaPipeHands` 的 `onResults` 回调中发送 landmarks

```typescript
// 📤 发送 landmarks 到后端（携带镜像/单位上下文）
wsRef.current.send(
  JSON.stringify({
    type: 'landmarks',
    ts: Date.now(),
    // 将 21 点转为 [x, y, z] 数组格式（tasks-vision 的 image 坐标，范围 0~1）
    points: (lms[0] ?? []).map((p: any) => [p.x, p.y, p.z ?? 0]),
    image: { width: videoWidth, height: videoHeight, unit: 'norm01' },
    mirrored: videoMirrored,  // 镜像状态（CSS transform: scaleX(-1)）
    target_gesture: targetGesture,
  }),
);
```

**要点**:
- `unit: 'norm01'` - 表示 0~1 归一化坐标（与 tasks-vision 一致）
- `mirrored: true` - 前端视频使用 CSS 镜像显示，坐标需要翻转

#### 2. 后端预处理容错 & 对齐

**文件**: `server/ml/realtime_recognition.py`

**关键函数**:

1. **`check_landmarks_quality()` - 质量检查容错**
   - visibility 容错：无字段时默认 1.0（tasks-vision 不返回 visibility）
   - bbox_area 阈值放宽：0.01 → 0.005（避免正常帧被误杀）
   
2. **`normalize_landmarks()` - 归一化对齐**
   - 镜像对齐：若 `mirrored=true`，x 坐标翻转 `x = 1 - x`
   - 居中：以手腕点（index 0）为基准平移到原点
   - 尺度归一：按手部最大边界缩放到单位尺度
   - 返回 63 维特征向量（与训练时顺序一致：x×21 + y×21 + z×21）

3. **`process_landmarks_input()` - 处理前端 landmarks**
   - 验证输入格式（21 个点、unit='norm01'）
   - 调用 `normalize_landmarks()` 归一化
   - 模型推理并返回 predicted、confidence、score

**Debug 日志开关**: 
- 环境变量 `PY_DEBUG=1` 启用详细日志
- 打印归一化后坐标、质量指标、top-3 概率分布

#### 3. 前端显示预测类别 & 分数

**文件**: `client/src/components/WebcamOverlay.tsx`

**UI 改动**: 在 Live Score Badge 下方增加预测结果卡片

```tsx
{/* 预测结果卡片（显示 predicted 和 confidence） */}
{predicted && confidence !== undefined && (
  <div className="bg-black/75 text-white px-3 py-2 rounded-lg shadow-lg text-sm backdrop-blur-sm">
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-300">预测:</span>
      <span className="font-bold text-lg text-cyan-400">{predicted}</span>
    </div>
    <div className="flex items-center justify-between gap-3 mt-1">
      <span className="text-gray-300">信心:</span>
      <span className={`font-medium ${confidence >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  </div>
)}
```

---

## 本地验收步骤（超短版）

### 1. 配置环境变量

在 `server/.env.development` 中添加：

```env
PY_WORKER_ENABLED=true
PY_DEBUG=1
```

### 2. 启动服务

```bash
cd GestureWorkshop
npm run dev
```

**注意**: 只需运行一次 `npm run dev`，后端和前端会同时启动。

### 3. 打开浏览器

访问: http://localhost:5173/webcam

### 4. 验收检查清单

#### A. 网络检查（浏览器 DevTools → Network）

打开浏览器开发者工具 (F12) → Network 标签页

**检查 1**: tasks-vision 资源加载成功
- 搜索 `tasks-vision` 或 `hand_landmarker.task`
- 状态应为 `200` 或 `304`（缓存）
- 如果是 404，说明 CDN 未正确加载

**检查 2**: WebSocket 连接成功
- 搜索 `/ws/gesture` 
- 状态应为 `101 Switching Protocols`
- Messages 标签页应有双向数据流

**检查 3**: Outgoing JSON 包含新字段
在 WS Messages 的 Outgoing（发送）部分，应看到：
```json
{
  "type": "landmarks",
  "points": [[0.5, 0.3, 0.1], ...],  // 21 个点，范围 0~1
  "image": {"width": 640, "height": 480, "unit": "norm01"},
  "mirrored": true,
  "target_gesture": "A"
}
```

**检查 4**: Incoming JSON 包含结果
在 WS Messages 的 Incoming（接收）部分，应看到：
```json
{
  "ok": true,
  "data": {
    "type": "gesture_result",
    "predicted": "A",
    "confidence": 0.85,
    "score": 85,
    "hands_detected": true,
    "landmarks_ok": true,
    "inference_ms": 15.2
  }
}
```

#### B. 控制台检查（浏览器 Console）

**预期日志**:
- `[UI] hand detected` - 检测到手部
- `[WS] score: 85, predicted: 'A', hands: Y` - 每 3 秒打印一次
- `[WS] sending frame (320x240, ~15KB)` - 发送帧（兼容旧路径）

#### C. 后端日志检查（终端）

**预期日志** (PY_DEBUG=1):
```json
{"type": "debug", "message": "🔧 Debug 模式已启用（PY_DEBUG=1）"}
{"type": "debug", "quality_check": {"avg_vis": 1.0, "bbox_area": 0.0234, "landmarks_ok": true, "mirrored": true}}
{"type": "debug", "normalized_sample": {"point_0": [0.0, 0.0, 0.0], "point_4": [0.156, 0.234, 0.012], ...}}
{"type": "debug", "prediction": {"predicted": "A", "confidence": 0.85, "top3": [["A", 0.85], ["S", 0.08], ...], "target": "A"}}
{"type": "perf", "avg_vis": 1.0, "bbox_area": 0.0234, "landmarks_ok": true, "predicted": "A", "target": "A", "confidence": 0.85, "inference_ms": 15.2}
```

**关键指标**:
- `avg_vis` 不再是 0（已容错为 1.0）
- `bbox_area` 合理（> 0.005，不再被拦截）
- `landmarks_ok: true`
- `predicted` 与 `target` 匹配
- `confidence >= 0.7`（高置信度）

#### D. UI 检查（摄像头界面）

1. **点击 "Start Camera"**
   - 视频预览正常显示
   - 右上角显示 "MP ready ✅"（MediaPipe 初始化成功）

2. **选择目标字母 A**
   - 在下拉框选择 "A"

3. **点击 "Start Recognition" (▶️)**
   - 开始识别

4. **做 A 手势**（拇指压在其余四指上）
   - **Live Score 在 2-3 秒内明显上升**（从 0 上升到 70-90）
   - **预测结果卡片出现**，显示：
     ```
     预测: A
     信心: 85%
     ```
   - 底部进度条随分数上升

5. **改变手势**（如做 H 手势）
   - Live Score 下降或稳定在低分
   - 预测类别变为 "H" 或其他
   - 信心值降低

#### E. 故障快速定位

**问题 1**: predicted 总是错误且信心低
- **原因**: 镜像设置不对
- **解决**: 修改 `WebcamViewer.tsx` 的 `videoMirrored` 初始值（true ↔ false）
  ```typescript
  const [videoMirrored, setVideoMirrored] = useState(false); // 尝试改为 false
  ```

**问题 2**: landmarks_ok 偶发 false
- **原因**: bbox_area 阈值仍然太严格
- **解决**: 继续放宽 `realtime_recognition.py` 中的阈值
  ```python
  landmarks_ok = (bbox_area > 0.003)  # 从 0.005 改为 0.003
  ```

**问题 3**: points 数值不是 0~1
- **原因**: 单位错误
- **解决**: 检查前端发送的 `unit` 字段是否为 `'norm01'`

**问题 4**: 后端无日志
- **原因**: Python 进程未启动
- **解决**: 检查 `server/.env.development` 中 `PY_WORKER_ENABLED=true`

---

## 关键差异 diff 摘要

### 前端 WebcamViewer.tsx
```diff
+ // 📤 发送 landmarks 到后端（携带镜像/单位上下文）
+ if (isRecognizing && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
+   wsRef.current.send(
+     JSON.stringify({
+       type: 'landmarks',
+       points: (lms[0] ?? []).map((p: any) => [p.x, p.y, p.z ?? 0]),
+       image: { width: videoWidth, height: videoHeight, unit: 'norm01' },
+       mirrored: videoMirrored,
+       target_gesture: targetGesture,
+     }),
+   );
+ }
```

### 后端 realtime_recognition.py
```diff
- landmarks_ok = (avg_vis > 0.45 and bbox_area > 0.01)
+ # visibility 容错：无字段时默认 1.0
+ avg_vis = 1.0 if is_raw_points else sum(visibilities) / len(visibilities)
+ # bbox 阈值放宽：0.01 → 0.005
+ landmarks_ok = (bbox_area > 0.005)

+ def normalize_landmarks(points, mirrored=False):
+     """归一化 landmarks（与训练数据对齐）"""
+     points = np.array(points, dtype=np.float32)
+     
+     # 1. 镜像对齐
+     if mirrored:
+         points[:, 0] = 1.0 - points[:, 0]
+     
+     # 2. 居中：以手腕点为基准
+     wrist = points[0].copy()
+     points = points - wrist
+     
+     # 3. 尺度归一化
+     max_range = max(xs.max() - xs.min(), ys.max() - ys.min(), zs.max() - zs.min())
+     if max_range > 1e-6:
+         points = points / max_range
+     
+     return feature_vector.tolist()
```

### 前端 WebcamOverlay.tsx
```diff
+ {/* 预测结果卡片（显示 predicted 和 confidence） */}
+ {predicted && confidence !== undefined && (
+   <div className="bg-black/75 text-white px-3 py-2 rounded-lg shadow-lg">
+     <div>预测: {predicted}</div>
+     <div>信心: {Math.round(confidence * 100)}%</div>
+   </div>
+ )}
```

---

## 验收成功标准

### ✅ 必须通过
1. **Live Score 提升**: 做正确手势 2-3 秒内，分数从 0 上升到 70+
2. **预测准确**: predicted 与目标字母一致，confidence >= 0.7
3. **日志正常**: 
   - 前端 Console 有 `[WS] score: XX, predicted: 'A'`
   - 后端日志有 `landmarks_ok: true`, `bbox_area` 合理
4. **UI 显示**: 右上角显示预测结果卡片（预测 + 信心）

### ⚠️ 可接受
- 偶发低分帧（< 60）：由于手势微小变化导致，属正常
- Debug 模式下日志略有卡顿：Python 打印大量日志，不影响实际推理

### ❌ 不通过
- Live Score 始终为 0 或极低（< 30）
- predicted 与目标完全不一致
- 后端日志 `landmarks_ok: false` 大量出现
- 前端报 WebSocket 连接错误

---

## 回退方案

如果验收失败需要回退，可使用以下 Git 命令：

```bash
# 查看当前分支
git branch

# 回退到上一个 commit（保留修改）
git reset --soft HEAD~1

# 或完全回退（丢弃修改）
git reset --hard HEAD~1
```

**注意**: 本次改动未修改 `package.json` 和 Render 配置，回退风险极低。

---

## 常见问题 FAQ

### Q1: 为什么需要发送 mirrored 字段？
**A**: 前端用 CSS `scaleX(-1)` 镜像显示视频（模拟镜子效果），但 MediaPipe 返回的坐标是原始坐标，需要后端知道镜像状态才能正确翻转。

### Q2: 为什么 visibility 要容错为 1.0？
**A**: tasks-vision 的 HandLandmarker 不返回 `visibility` 字段（与旧版 Hands 不同），如果按旧逻辑判断 avg_vis，会得到 0，导致误判为"质量差"。

### Q3: bbox_area 阈值为什么要放宽？
**A**: 训练数据中可能包含较远距离的手势，bbox_area 会较小（0.01 左右），原阈值太严格会误杀正常帧。

### Q4: 为什么要归一化（居中 + 尺度）？
**A**: 训练模型时对 landmarks 做了归一化预处理，推理时必须保持一致，否则会导致特征分布不匹配，预测不准。

---

## 联系支持

如遇到其他问题，请提供以下信息：
1. 浏览器 Console 日志截图
2. 后端终端日志截图
3. Network 标签页 WS Messages 截图
4. 具体手势（如 A/B/C）

---

**最后更新**: 2025-11-04
**版本**: v1.0.0
**分支**: fix/scoring-preprocess-align

