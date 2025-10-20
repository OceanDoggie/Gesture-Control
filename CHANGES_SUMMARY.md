# 评分系统实施 - 改动总结

## 📦 新增文件 (3个)

### 1. `client/src/hooks/useGestureScore.ts`
**作用：** 评分统计 Hook  
**功能：**
- 从 WebSocket 消息提取置信度和匹配结果
- 维护实时分数（0-100）
- 统计总帧数、正确帧数、准确率
- 无手帧自动排除

**核心逻辑：**
```typescript
const onMessage = useCallback((msg: GestureMessage) => {
  if (!msg?.ok || msg.data?.type !== "gesture_result") return;
  const { hands_detected, confidence, target, predicted } = msg.data;
  
  if (!hands_detected) return; // 无手不计入
  
  const currentScore = Math.round(confidence * 100);
  setScore(currentScore);
  setTotal(t => t + 1);
  
  if (predicted === target) setHits(h => h + 1);
}, []);
```

---

### 2. `client/src/components/WebcamOverlay.tsx`
**作用：** 实时评分叠加层  
**功能：**
- 右上角 Badge 显示 Live Score
- 底部进度条反映分数
- 根据分数动态调整颜色（绿/橙/黄/红）

**颜色映射：**
- 90+: 绿色 (优秀)
- 75-89: 橙色 (良好)
- 60-74: 黄色 (合格)
- <60: 红色 (需要改进)

---

### 3. `评分系统实施说明.md`
**作用：** 完整的实施文档  
**内容：**
- 改动详情
- 启动验证步骤
- 自测清单
- 参数调整指南
- 故障排除

---

## 🔧 修改文件 (4个)

### 1. `server/ml/realtime_recognition.py`

#### 改动 1：导入和配置
```python
from collections import defaultdict

# EMA 平滑配置
ema_conf = defaultdict(float)
EMA_ALPHA = 0.35
```

#### 改动 2：新增 EMA 平滑函数
```python
def ema_smooth(key, value):
    """指数移动平均平滑"""
    prev = ema_conf[key]
    smoothed = EMA_ALPHA * value + (1 - EMA_ALPHA) * prev
    ema_conf[key] = smoothed
    return smoothed
```

#### 改动 3：新增关键点质量检测
```python
def check_landmarks_quality(hand_landmarks):
    """检测关键点质量"""
    for lm in hand_landmarks.landmark:
        if lm.x < 0 or lm.x > 1 or lm.y < 0 or lm.y > 1:
            return False
        if hasattr(lm, 'visibility') and lm.visibility < 0.5:
            return False
    return True
```

#### 改动 4：重写 process_frame 函数
**原逻辑：** 返回旧格式（gestures 数组）  
**新逻辑：**
- 接收 `target_gesture` 参数
- 返回新协议 `{ok, data: {hands_detected, target, predicted, confidence, landmarks_ok}}`
- 应用质量降权（0.5x）和错误降权（0.6x）
- 应用 EMA 平滑

**核心代码：**
```python
# 质量闸门
if not landmarks_ok:
    raw_confidence *= 0.5

# 错误降权
if target_gesture and predicted_label != target_gesture:
    raw_confidence *= 0.6

# EMA 平滑
confidence_smooth = ema_smooth(target_gesture or predicted_label, raw_confidence)

return {
    'ok': True,
    'data': {
        'type': 'gesture_result',
        'hands_detected': True,
        'target': target_gesture,
        'predicted': predicted_label,
        'confidence': float(confidence_smooth),
        'landmarks_ok': landmarks_ok
    }
}
```

#### 改动 5：主循环支持 target_gesture
```python
if message.get('type') == 'process_frame':
    frame_data = message.get('frame') or message.get('frame_data')
    target_gesture = message.get('target_gesture', '')  # 新增
    
    if frame_data:
        result = process_frame(frame_data, target_gesture)
        print(json.dumps(result), flush=True)
```

---

### 2. `client/src/components/WebcamViewer.tsx`

#### 改动 1：导入新 Hook 和组件
```typescript
import { useGestureScore } from '@/hooks/useGestureScore';
import { WebcamOverlay } from '@/components/WebcamOverlay';
```

#### 改动 2：使用评分 Hook
```typescript
const { score, accuracy, total, hits, onMessage: onScoreMessage, reset: resetScore } = useGestureScore();
```

#### 改动 3：处理 WebSocket 消息
```typescript
const handleWebSocketMessage = (data: any) => {
  // 新协议：处理评分消息
  if (data.ok !== undefined) {
    onScoreMessage(data);
  }
  
  // 旧协议兼容...
};
```

#### 改动 4：开始识别时重置评分
```typescript
const startGestureRecognition = async (gesture: string) => {
  // ... 现有代码 ...
  resetScore(); // 新增
  // ... 现有代码 ...
};
```

#### 改动 5：添加 Overlay 到视频容器
```typescript
<div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
  <video ref={videoRef} ... />
  <canvas ref={canvasRef} className="hidden" />
  
  {/* 新增：评分 Overlay */}
  {isRecognizing && <WebcamOverlay score={score} />}
  
  {/* ... 其他元素 ... */}
</div>
```

#### 改动 6：更新统计面板
```typescript
<div className="space-y-2">
  <h3 className="font-medium text-sm">{lang.stats.title}</h3>
  <div className="text-xs text-muted-foreground">
    <div>{lang.stats.totalFrames}: {total}</div>
    <div>{lang.stats.correctFrames}: {hits}</div>
    <div>{lang.stats.accuracy}: {accuracy}%</div>
  </div>
</div>
```

---

### 3. `client/src/i18n/en.ts`

#### 改动：添加新文案
```typescript
stats: {
  title: "Recognition Stats",
  totalFrames: "Total Frames",
  correctFrames: "Correct Frames",  // 新增
  accuracy: "Accuracy",
  confidence: "Confidence",
  feedback: "Feedback",
  liveScore: "Live Score",           // 新增
},
```

---

### 4. `server/websocket_service.ts`

**无需改动** - 已经正确传递 `target_gesture` 参数到 Python（第 243 行）。

---

## 📊 数据流图

```
用户摄像头
    ↓
WebcamViewer (前端)
    ↓ [每帧发送 base64 图像 + target_gesture]
WebSocket 服务 (Node.js)
    ↓ [转发到 Python]
realtime_recognition.py (后端)
    ↓
1. MediaPipe 检测手部
2. 提取关键点
3. KNN 模型预测手势
4. 检查关键点质量
5. 计算原始置信度
6. 应用质量降权 (0.5x if bad)
7. 应用错误降权 (0.6x if mismatch)
8. 应用 EMA 平滑 (alpha=0.35)
    ↓ [返回 JSON 协议]
WebSocket 服务
    ↓ [转发到前端]
useGestureScore Hook
    ↓
1. 提取 confidence (0-1)
2. 转换为 score (0-100)
3. 判断是否命中 (predicted === target)
4. 更新统计 (total, hits, accuracy)
    ↓
WebcamOverlay 组件
    ↓
显示实时评分（Badge + 进度条）
```

---

## 🎯 核心算法

### EMA 平滑公式
```
conf_smooth = alpha * conf_current + (1 - alpha) * conf_previous
```
- `alpha = 0.35`：当前帧权重
- `1 - alpha = 0.65`：历史权重
- 效果：平滑抖动，响应适中

### 置信度计算流程
```python
# 1. 模型原始输出
raw_conf = max(model.predict_proba(features)[0])

# 2. 质量降权
if not landmarks_ok:
    raw_conf *= 0.5

# 3. 错误降权
if predicted != target:
    raw_conf *= 0.6

# 4. EMA 平滑
conf_smooth = ema_smooth(target, raw_conf)
```

### 准确率计算
```typescript
accuracy = (hits / total) * 100
```
- `hits`：predicted === target 的帧数
- `total`：有手的总帧数（无手帧不计入）

---

## 🧪 测试场景覆盖

| 场景 | 预期行为 | 验证点 |
|------|----------|--------|
| 正确手势 1-2 秒 | Score ≥75，绿色/橙色 | Accuracy 上升 |
| 错误手势 | Score <60，红色/黄色 | Accuracy 下降/不变 |
| 无手 | 统计不变 | Total Frames 不增加 |
| 暗光/背光 | Score 略降但平滑 | 无剧烈抖动 |
| WebSocket 断开 | 自动重连 | 刷新页面后恢复 |

---

## 🔐 向后兼容性

1. **旧协议支持：** `handleWebSocketMessage()` 仍处理 `data.type === 'gesture_result'` 的旧消息
2. **Python 模型未加载：** 自动降级到模拟数据（`predicted='A', confidence=0.75`）
3. **WebSocket 服务：** 已有的 `target_gesture` 传递逻辑无需改动

---

## 📏 参数调优建议

| 参数 | 位置 | 默认值 | 建议范围 | 效果 |
|------|------|--------|----------|------|
| EMA_ALPHA | `realtime_recognition.py:51` | 0.35 | 0.2 - 0.5 | 越高越灵敏 |
| 质量降权系数 | `realtime_recognition.py:170` | 0.5 | 0.3 - 0.7 | 越低越严格 |
| 错误降权系数 | `realtime_recognition.py:174` | 0.6 | 0.3 - 0.8 | 越低越严格 |
| 颜色阈值（绿） | `WebcamOverlay.tsx:19` | 90 | 85 - 95 | 优秀标准 |
| 颜色阈值（橙） | `WebcamOverlay.tsx:20` | 75 | 70 - 80 | 良好标准 |
| 颜色阈值（黄） | `WebcamOverlay.tsx:21` | 60 | 55 - 65 | 合格标准 |

---

## 🐛 已知限制

1. **多手检测：** 目前仅处理第一个检测到的手（`results.multi_hand_landmarks[0]`）
2. **模型依赖：** 需要 `asl_knn_model.pkl` 文件存在，否则降级到模拟数据
3. **实时性：** 帧率取决于 `requestAnimationFrame` 和 Python 处理速度
4. **无手判断：** MediaPipe 检测失败时立即返回 `hands_detected=false`，不区分"暂时遮挡"和"真正无手"

---

## ✅ 检查清单

### 后端
- [x] Python 依赖已安装（mediapipe, opencv, numpy, joblib, scikit-learn）
- [x] `realtime_recognition.py` 导入 `defaultdict`
- [x] EMA 函数实现正确
- [x] 质量检测函数实现
- [x] `process_frame()` 接受 `target_gesture` 参数
- [x] 返回新 JSON 协议
- [x] 主循环传递 `target_gesture`

### 前端
- [x] `useGestureScore.ts` 创建
- [x] `WebcamOverlay.tsx` 创建
- [x] `WebcamViewer.tsx` 导入新 Hook 和组件
- [x] WebSocket 消息处理调用 `onScoreMessage()`
- [x] 视频容器添加 Overlay
- [x] 统计面板更新为新字段
- [x] i18n 文案添加 `correctFrames` 和 `liveScore`
- [x] 无 linter 错误

### 文档
- [x] `评分系统实施说明.md` 创建
- [x] `CHANGES_SUMMARY.md` 创建
- [x] `快速验证-评分系统.bat` 创建

---

## 🚀 提交信息

```
feat(scoring): live score overlay and accuracy stats for gesture recognition

- Backend: Add EMA smoothing (alpha=0.35) for confidence calculation
- Backend: Implement landmarks quality check with 0.5x penalty
- Backend: Return new JSON protocol with hands_detected, predicted, target, confidence, landmarks_ok
- Frontend: Add useGestureScore hook for score/total/hits/accuracy tracking
- Frontend: Add WebcamOverlay component with live score badge and progress bar
- Frontend: Integrate overlay into WebcamViewer with color-coded feedback
- Frontend: Add Total Frames, Correct Frames, Accuracy stats to Recognition Stats panel
- i18n: Add correctFrames and liveScore English labels

No hands frames are excluded from statistics.
Color zones: green (90+), orange (75-89), yellow (60-74), red (<60).
```

---

## 📅 实施日期
2025-10-16

## 👨‍💻 实施者
AI Assistant (Claude Sonnet 4.5)

---

**状态：✅ 已完成并通过 linter 检查**




