# 🤖 AI手势识别系统 - GestureWorkshop

基于AI的实时手语识别Web应用，使用MediaPipe手部追踪和KNN机器学习模型。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

---

## ✨ 功能特点

- 🎥 **实时手势识别** - 基于摄像头的实时AI识别
- 🧠 **智能评分系统** - A/B/C/D四级评分，实时反馈手势质量
- 📊 **置信度显示** - 显示识别准确度百分比
- 💻 **现代化界面** - 使用React + shadcn/ui构建
- ⚡ **WebSocket通信** - 低延迟实时数据传输
- 🐍 **Python AI后端** - MediaPipe + scikit-learn
- 📈 **识别统计** - 实时显示识别成功率

---

## 🚀 快速开始

### 本地运行

#### 1. 一键安装依赖
```bash
# 双击运行（Windows）
一键安装依赖.bat

# 或手动安装
pip install -r requirements.txt
npm install
```

#### 2. 启动服务器
```bash
# 双击运行（Windows）
RUN_SERVER.bat

# 或手动启动
npm run backend
```

#### 3. 访问应用
打开浏览器访问：http://localhost:4000

---

## 🌐 在线部署

### Railway部署（推荐）⭐⭐⭐⭐⭐

**最简单的部署方式，完整支持所有功能**

```bash
1. 推送代码到GitHub
2. 访问 https://railway.app
3. 连接仓库
4. 自动部署
```

详细步骤请查看：[快速部署-Railway.md](快速部署-Railway.md)

### 其他部署选项

- **Render** - 完整功能支持
- **Netlify** - 仅前端（AI功能不可用）

查看完整对比：[部署方案说明.md](部署方案说明.md)

---

## 🛠️ 技术栈

### 前端
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **shadcn/ui** - UI组件库
- **Tailwind CSS** - 样式框架
- **Wouter** - 路由
- **TanStack Query** - 数据管理

### 后端
- **Node.js** - 运行时
- **Express** - Web框架
- **WebSocket (ws)** - 实时通信
- **Python Shell** - Python集成

### AI/ML
- **Python 3.11** - AI运行环境
- **MediaPipe** - 手部追踪
- **OpenCV** - 图像处理
- **scikit-learn** - 机器学习（KNN模型）
- **NumPy** - 数值计算
- **Pandas** - 数据处理

---

## 📁 项目结构

```
GestureWorkshop/
├── client/                    # 前端代码
│   ├── src/
│   │   ├── components/       # React组件
│   │   │   ├── WebcamViewer.tsx  # 主要手势识别组件
│   │   │   └── ui/           # UI组件库
│   │   ├── pages/            # 页面组件
│   │   └── main.tsx          # 入口文件
│   └── dist/                 # 构建输出
│
├── server/                    # 后端代码
│   ├── index.ts              # 服务器入口
│   ├── websocket_service.ts  # WebSocket服务
│   ├── gesture_api.ts        # 手势API
│   └── ml/                   # AI/ML相关
│       ├── realtime_recognition_with_scoring.py  # AI识别脚本
│       ├── AIModelTrain.py   # 模型训练
│       ├── asl_knn_model.pkl # 训练好的模型
│       └── asl_dataset.csv   # 训练数据集
│
├── requirements.txt           # Python依赖
├── package.json              # Node.js依赖
├── railway.json              # Railway配置
├── netlify.toml              # Netlify配置
└── Procfile                  # 启动命令

```

---

## 🎯 使用说明

### 1. 启动相机
点击"启动相机"按钮，允许浏览器访问摄像头。

### 2. 选择手势
从A-E中选择一个手势进行练习。

### 3. 做手势
对着摄像头做出标准的ASL字母手势。

### 4. 查看结果
右上角会显示：
- **手势名称** - 识别的字母
- **评分等级** - A（优秀）/ B（良好）/ C（合格）/ D（需改进）
- **置信度** - 识别准确度百分比
- **评价描述** - 详细反馈

---

## 🧪 AI模型说明

### 训练数据
- **数据集**：ASL字母手语数据集
- **样本数量**：376个手势样本
- **特征维度**：63维（21个关键点 × 3坐标）

### 模型架构
- **算法**：K-Nearest Neighbors (KNN)
- **准确率**：约73%
- **支持手势**：A, B, C, D, E等字母

### 评分系统
```python
置信度 ≥ 90%  → A (优秀)
置信度 ≥ 75%  → B (良好)
置信度 ≥ 60%  → C (合格)
置信度 < 60%   → D (需改进)
```

---

## 🔧 开发指南

### 环境要求
- **Python**: 3.8+
- **Node.js**: 18+
- **摄像头**: 用于手势识别

### 安装开发依赖
```bash
# Python依赖
pip install -r requirements.txt

# Node.js依赖
npm install
```

### 开发模式
```bash
# 启动后端
npm run backend

# 前端会自动通过Vite开发服务器运行
```

### 构建生产版本
```bash
# 构建前端
npm run build

# 构建后端
npm run build:server

# 启动生产服务器
npm run start
```

---

## 📚 文档

- 📖 [快速部署指南](快速部署-Railway.md)
- 📖 [Railway部署详细说明](Railway部署指南.md)
- 📖 [部署方案对比](部署方案说明.md)
- 📖 [部署检查清单](部署检查清单.md)
- 📖 [启动和测试指南](启动和测试指南.md)
- 📖 [连接失败问题解决](连接失败问题解决方案.md)

---

## 🐛 常见问题

### Q: WebSocket连接失败？
**A:** 确保后端服务器已启动，检查Python依赖是否完整安装。详见[连接失败问题解决方案.md](连接失败问题解决方案.md)

### Q: AI识别不准确？
**A:** 
- 确保光线充足
- 手部完整在摄像头视野内
- 使用纯色背景
- 参考标准ASL手语图片

### Q: 如何训练新的手势？
**A:** 
1. 准备手势数据集（CSV格式）
2. 运行 `python server/ml/AIModelTrain.py`
3. 模型会保存为 `asl_knn_model.pkl`

### Q: 部署到Netlify为什么不工作？
**A:** Netlify不支持WebSocket和Python后端，请使用Railway或Render。详见[部署方案说明.md](部署方案说明.md)

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

## 📄 许可证

MIT License

---

## 👨‍💻 作者

你的名字

---

## 🙏 致谢

- [MediaPipe](https://mediapipe.dev/) - 手部追踪
- [shadcn/ui](https://ui.shadcn.com/) - UI组件
- [Railway](https://railway.app/) - 部署平台

---

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- Email: your.email@example.com

---

**⭐ 如果这个项目对你有帮助，请给个Star！**


