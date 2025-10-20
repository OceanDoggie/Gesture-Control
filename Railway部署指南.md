# 🚂 Railway 部署指南（推荐方案）

## 为什么选择Railway？

✅ **完美支持你的项目**
- Node.js后端 ✓
- Python AI服务 ✓
- WebSocket实时通信 ✓
- 自动检测依赖 ✓

✅ **免费额度充足**
- 500小时/月运行时间
- 足够个人项目和演示使用

✅ **部署超简单**
- 连接GitHub自动部署
- 推送代码自动更新
- 无需复杂配置

---

## 📋 部署前准备

### 1. 确保代码已推送到GitHub

如果还没有，运行：
```bash
# 初始化Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "准备部署到Railway"

# 连接到GitHub仓库
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送
git push -u origin main
```

### 2. 已创建的配置文件

我已经为你创建了：
- ✅ `railway.json` - Railway配置
- ✅ `Procfile` - 启动命令
- ✅ `requirements.txt` - Python依赖
- ✅ `package.json` - Node.js依赖

---

## 🚀 部署步骤（超简单）

### 步骤1：注册Railway

1. 访问：https://railway.app
2. 点击 "Start a New Project"
3. 使用GitHub账号登录

### 步骤2：创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 授权Railway访问你的GitHub
4. 选择你的GestureWorkshop仓库

### 步骤3：配置项目

Railway会自动检测到：
- ✅ `package.json` → 安装Node.js依赖
- ✅ `requirements.txt` → 安装Python依赖
- ✅ `Procfile` → 使用启动命令

**无需手动配置！**

### 步骤4：等待部署

- Railway会自动：
  1. 安装Python依赖（mediapipe, opencv等）
  2. 安装Node.js依赖
  3. 训练AI模型（如果需要）
  4. 启动服务器
  
- 进度可以在部署日志中查看

### 步骤5：获取URL

部署成功后：
- Railway会提供一个URL：`https://你的项目名.up.railway.app`
- 点击URL即可访问你的AI手势识别应用！

---

## 🔧 可能需要的配置

### 环境变量（如果需要）

在Railway项目设置中添加：

```
PORT=4000
NODE_ENV=production
```

但通常Railway会自动配置，无需手动设置。

---

## 📊 部署后检查

### 1. 查看部署日志

在Railway控制台查看：
```
✅ Installing Python dependencies...
✅ Installing Node.js dependencies...
✅ Training AI model...
✅ Starting server...
✅ Server listening on port 4000
```

### 2. 测试应用

1. 访问Railway提供的URL
2. 点击"Webcam"菜单
3. 启动相机
4. 检查WebSocket连接（应显示"✅ 已连接"）
5. 测试手势识别

---

## ⚠️ 常见问题

### Q1: 部署失败，显示Python错误

**解决：** 检查 `requirements.txt` 是否包含所有依赖
```txt
mediapipe>=0.10.0
opencv-python-headless>=4.8.0  # 注意：服务器用headless版本
numpy>=1.24.0
joblib>=1.3.0
scikit-learn>=1.3.0
pandas>=2.0.0
```

### Q2: WebSocket连接失败

**解决：** 确保前端WebSocket URL正确
- Railway会自动处理WebSocket升级
- 使用相对路径 `/ws/gesture` 应该可以工作

### Q3: 摄像头无法访问

**原因：** Railway URL是HTTPS，但摄像头需要安全上下文
**这应该自动工作** - Railway默认提供HTTPS

### Q4: AI模型加载失败

**解决：** 
1. 确保 `server/ml/asl_knn_model.pkl` 已提交到仓库
2. 或者让 `RUN_SERVER.bat` 在部署时训练模型

---

## 💡 优化建议

### 1. 使用环境变量

在 `server/index.ts` 中：
```typescript
const port = parseInt(process.env.PORT || '4000', 10);
```

### 2. 添加健康检查

Railway会自动ping你的应用，确保有 `/api/health` 端点。

### 3. 优化Python包

如果部署太慢，可以使用轻量级版本：
```txt
opencv-python-headless  # 而不是 opencv-python
```

---

## 📈 部署后监控

### Railway提供的功能：

1. **实时日志** - 查看服务器输出
2. **性能指标** - CPU、内存使用
3. **部署历史** - 回滚到之前版本
4. **自动重启** - 服务崩溃时自动重启

---

## 🔄 更新部署

每次推送代码到GitHub，Railway会自动：
1. 检测到更改
2. 重新构建
3. 部署新版本
4. 零停机切换

```bash
# 本地修改后
git add .
git commit -m "更新功能"
git push

# Railway自动部署！
```

---

## 💰 费用说明

### 免费层级
- ✅ 500小时/月
- ✅ 足够个人项目
- ✅ 不需要信用卡

### 超出后
- 每月$5起的付费计划
- 可以暂停项目避免收费

---

## 🎉 总结

**Railway部署流程：**
1. 推送代码到GitHub（5分钟）
2. 在Railway连接仓库（2分钟）
3. 等待自动部署（5-10分钟）
4. 获取URL并测试（1分钟）

**总计：约15分钟完成部署！**

---

## 🚨 注意事项

### 服务器环境 vs 本地环境

**摄像头访问：**
- ✅ 用户的浏览器访问自己的摄像头
- ✅ 不是服务器的摄像头
- ✅ 在线部署后功能完全正常

**WebSocket：**
- ✅ Railway支持WebSocket
- ✅ 自动处理连接升级
- ✅ 无需额外配置

**Python进程：**
- ✅ Railway支持后台Python进程
- ✅ 可以长时间运行
- ✅ 与Node.js配合良好

---

## 📞 需要帮助？

如果部署遇到问题：

1. **查看Railway部署日志** - 找到具体错误
2. **检查GitHub仓库** - 确保所有文件已推送
3. **验证配置文件** - railway.json, requirements.txt
4. **联系我** - 提供错误日志截图

---

**现在就可以开始部署了！推送代码到GitHub，然后连接Railway！** 🚀


