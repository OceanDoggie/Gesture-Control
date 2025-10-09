# AI手势识别系统设置指南

## 🎯 系统概述

这是一个完整的AI手势识别系统，集成了：
- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Node.js + Express + WebSocket
- **AI**: Python + MediaPipe + scikit-learn
- **实时通信**: WebSocket

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装Node.js依赖
npm install

# 安装Python依赖
pip install mediapipe opencv-python scikit-learn joblib numpy pillow
```

### 2. 训练AI模型

```bash
# 进入ML目录
cd server/ml

# 训练模型
python train_model.py
```

### 3. 启动服务

```bash
# 启动后端服务
npm run backend

# 在另一个终端启动前端
npm run dev
```

## 🧠 AI功能特性

### 手势识别
- ✅ 实时手部检测
- ✅ 21个手部关键点追踪
- ✅ 机器学习手势分类
- ✅ 置信度评分
- ✅ 多手势同时识别

### 支持的手势
- **A-Z**: 26个英文字母手势
- **难度分级**: 简单/中等/困难
- **实时指导**: 手势说明和练习提示

### 技术栈
- **MediaPipe**: 手部关键点检测
- **scikit-learn**: KNN分类器
- **OpenCV**: 图像处理
- **WebSocket**: 实时通信

## 📁 项目结构

```
GestureWorkshop/
├── client/                 # 前端React应用
│   ├── src/
│   │   ├── components/
│   │   │   └── WebcamViewer.tsx  # AI手势识别组件
│   │   └── pages/
│   │       └── Webcam.tsx        # 相机页面
├── server/                # 后端服务
│   ├── ml/               # 机器学习模块
│   │   ├── gesture_service.py    # 手势识别服务
│   │   ├── gesture_bridge.py     # Python桥接脚本
│   │   ├── train_model.py        # 模型训练脚本
│   │   └── asl_dataset.csv       # 手语数据集
│   ├── websocket_service.ts      # WebSocket服务
│   ├── gesture_api.ts           # 手势识别API
│   └── routes.ts               # 路由配置
└── AI_SETUP.md           # 本文件
```

## 🔧 API端点

### 手势识别
- `POST /api/gesture/process` - 处理手势识别
- `GET /api/gesture/instructions/:gesture` - 获取手势指导
- `GET /api/gesture/list` - 获取所有支持的手势
- `GET /api/gesture/status` - 获取服务状态

### WebSocket
- `ws://localhost:5000/ws/gesture` - 实时手势识别

## 🎮 使用方法

### 1. 启动相机
- 点击"启动相机"按钮
- 允许浏览器访问摄像头

### 2. 选择手势
- 从A-E中选择要练习的手势
- 系统会显示手势指导

### 3. 开始识别
- 按照指导做出手势
- 系统会实时显示识别结果
- 查看置信度和准确率

### 4. 查看反馈
- 实时识别结果显示在视频上
- 统计信息显示在控制面板
- 手势指导显示在信息面板

## 🛠️ 开发说明

### 添加新手势
1. 在`gesture_service.py`中添加手势标签
2. 在`gesture_api.ts`中添加指导信息
3. 重新训练模型

### 自定义模型
1. 修改`train_model.py`中的模型参数
2. 调整`gesture_service.py`中的置信度阈值
3. 重新训练和测试

### 调试模式
- 查看浏览器控制台日志
- 检查WebSocket连接状态
- 监控Python进程输出

## 🐛 故障排除

### 常见问题

1. **相机无法启动**
   - 检查浏览器权限设置
   - 确保摄像头未被其他应用占用

2. **AI识别不工作**
   - 检查Python依赖是否安装
   - 确认模型文件是否存在
   - 查看WebSocket连接状态

3. **识别准确率低**
   - 确保手部在摄像头范围内
   - 调整光照条件
   - 重新训练模型

### 日志查看
```bash
# 查看后端日志
npm run backend

# 查看Python进程日志
# 在浏览器开发者工具中查看WebSocket消息
```

## 📈 性能优化

### 前端优化
- 调整视频分辨率
- 优化帧率处理
- 减少不必要的重渲染

### 后端优化
- 调整MediaPipe参数
- 优化模型推理速度
- 实现帧缓存机制

## 🔮 未来功能

- [ ] 手势序列识别
- [ ] 手势动画指导
- [ ] 多语言支持
- [ ] 手势录制和回放
- [ ] 云端模型训练
- [ ] 移动端适配

## 📞 技术支持

如有问题，请检查：
1. 所有依赖是否正确安装
2. 模型文件是否存在
3. WebSocket连接是否正常
4. 浏览器控制台是否有错误

---

🎉 **恭喜！您的AI手势识别系统已就绪！**

