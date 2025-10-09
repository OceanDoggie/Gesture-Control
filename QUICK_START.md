# 🚀 快速启动指南

## 系统配置完成 ✅

您的AI手势识别系统已经配置完成，使用您自己的原始代码：

### 📁 使用的文件
- **`AIModelTrain.py`** - 您的模型训练代码
- **`mediapipeImport.py`** - 您的MediaPipe手部检测代码  
- **`asl_dataset.csv`** - 您的手语数据集 (376行数据)
- **`realtime_recognition.py`** - 实时识别服务（基于您的代码整合）

## 🎯 启动步骤

### 1. 训练模型（首次使用）

打开终端，运行：

```bash
cd GestureWorkshop/server/ml
python AIModelTrain.py
```

这会生成 `asl_knn_model.pkl` 模型文件。

### 2. 启动后端服务

**终端1**（在GestureWorkshop目录下）：
```bash
npm run backend
```

等待看到：`serving on port 5000`

### 3. 启动前端服务

**终端2**（打开新终端，在GestureWorkshop目录下）：
```bash
npm run dev
```

等待看到：`Local: http://localhost:5173/`

## 🌐 访问和测试

1. **打开浏览器**：访问 `http://localhost:5173`

2. **进入Webcam页面**：点击顶部导航栏的 "Webcam"

3. **启动AI识别**：
   - 点击"启动相机"按钮
   - 允许浏览器访问摄像头
   - 选择要练习的手势（A-E）
   - 系统开始实时AI识别！

## 🔍 系统工作流程

```
前端(React) → WebSocket → Node.js后端 → Python服务
                                          ↓
                              您的mediapipeImport.py
                              您的AIModelTrain.py模型
                              您的asl_dataset.csv数据
```

## 📊 预期效果

当您做出手势时，应该看到：
- ✅ 实时视频流显示
- ✅ 手部关键点检测（绿色线条）
- ✅ AI识别结果显示在右上角
- ✅ 置信度百分比
- ✅ 手势指导信息
- ✅ 识别统计数据

## 🛠️ 故障排除

### 模型文件不存在
```bash
# 确保先训练模型
cd server/ml
python AIModelTrain.py
```

### Python依赖缺失
```bash
pip install mediapipe opencv-python scikit-learn joblib numpy
```

### WebSocket连接失败
- 确保后端服务已启动
- 检查端口5000是否可用
- 查看浏览器控制台日志

### 摄像头无法访问
- 检查浏览器权限设置
- 确保摄像头未被其他应用占用
- 使用HTTPS或localhost

## 📝 当前文件位置

```
GestureWorkshop/
├── server/
│   ├── ml/
│   │   ├── AIModelTrain.py          # 您的训练代码
│   │   ├── mediapipeImport.py       # 您的MediaPipe代码
│   │   ├── asl_dataset.csv          # 您的数据集
│   │   ├── realtime_recognition.py  # 实时服务（整合）
│   │   └── asl_knn_model.pkl        # 训练后生成
│   ├── gesture_api.ts               # REST API
│   ├── websocket_service.ts         # WebSocket服务
│   └── routes.ts                    # 路由配置
└── client/
    └── src/
        └── components/
            └── WebcamViewer.tsx     # 前端界面

```

## ✅ 系统已配置项

- ✅ 使用您的原始训练代码
- ✅ 使用您的MediaPipe检测代码
- ✅ 使用您的手语数据集
- ✅ WebSocket实时通信已配置
- ✅ 前端AI界面已就绪
- ✅ 所有路径已正确配置

现在您可以启动系统进行测试了！🎉

