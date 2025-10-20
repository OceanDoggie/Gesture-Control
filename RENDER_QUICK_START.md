# Render 部署快速清单 ⚡

## 📝 已完成的修改

✅ **步骤 1**: 端口和健康检查 - 已配置 `process.env.PORT` 和 `/healthz` 路由  
✅ **步骤 2**: Python 环境变量 - 已使用 `PYTHON_BIN` 和 `MODEL_DIR`  
✅ **步骤 3**: 前端 API 配置 - 已使用 `VITE_API_BASE` 环境变量  
✅ **步骤 4**: 创建 `render.yaml` - Blueprint 配置文件已就绪  
✅ **步骤 5**: 模型下载脚本 - 自动下载模型到 `/models` 目录

---

## 🚀 接下来的操作（需要您手动完成）

### 步骤 1: 提交并推送代码

```bash
cd GestureWorkshop
git add .
git commit -m "feat: 添加 Render 部署配置"
git push origin main
```

---

### 步骤 2: 在 Render 创建 Blueprint 部署

1. 访问 https://dashboard.render.com/
2. 点击 **"New +"** → **"Blueprint"**
3. 连接您的 GitHub 仓库
4. 选择 `GestureWorkshop` 仓库（刚刚 push 的）
5. Render 会自动检测 `render.yaml` 并创建：
   - ✨ `gesture-api`（后端服务）
   - ✨ `gesture-client`（前端服务）

---

### 步骤 3: 等待部署完成

部署完成后，记录两个 URL：

- **后端 URL**: `https://gesture-api-xxxxx.onrender.com`
- **前端 URL**: `https://gesture-client-xxxxx.onrender.com`

---

### 步骤 4: 配置环境变量

#### 4.1 配置 `gesture-api` 服务

进入 Render 控制台 → 选择 `gesture-api` → **Environment** 标签页 → 添加：

```
CORS_ORIGIN=<前端 URL，如 https://gesture-client-xxxxx.onrender.com>
```

点击 **"Save Changes"**

---

#### 4.2 配置 `gesture-client` 服务

进入 Render 控制台 → 选择 `gesture-client` → **Environment** 标签页 → 添加：

```
VITE_API_BASE=<后端 URL，如 https://gesture-api-xxxxx.onrender.com>
```

点击 **"Save Changes"**

---

### 步骤 5: 重新部署服务

1. 在 `gesture-api` 页面点击 **"Manual Deploy"** → **"Deploy latest commit"**
2. 在 `gesture-client` 页面点击 **"Manual Deploy"** → **"Deploy latest commit"**

---

## ✅ 验证部署

### 检查后端健康状态

```bash
curl https://<你的后端URL>/healthz
# 应返回: ok
```

### 访问前端

在浏览器打开前端 URL，检查：
- ✅ 页面正常加载
- ✅ 浏览器控制台显示 `[WS] ✅ Connected to backend`
- ✅ 摄像头功能正常

---

## 🐛 遇到问题？

### 问题 1: WebSocket 连接失败

**解决**:
- 确认 `VITE_API_BASE` 已正确设置为后端 URL
- 确认 `CORS_ORIGIN` 已正确设置为前端 URL
- 重新部署两个服务

### 问题 2: 模型文件缺失

**解决**:
- 在 `gesture-api` 服务的 **Environment** 中添加：
  ```
  MODEL_DOWNLOAD_URL=<你的模型文件下载地址>
  ```
- 或者手动将模型文件添加到仓库的 `server/ml/` 目录

### 问题 3: Python 未安装

**临时解决方案**:  
在 `render.yaml` 的 `gesture-api` 服务中添加 `pythonVersion: "3.9"`:

```yaml
services:
  - type: web
    name: gesture-api
    runtime: node
    env: node
    pythonVersion: "3.9"  # 添加这行
```

重新推送并部署。

---

## 📚 详细文档

更详细的部署说明，请查看：
- 📖 [RENDER_DEPLOY_GUIDE.md](./RENDER_DEPLOY_GUIDE.md)
- 📖 [Render 官方文档](https://render.com/docs)

---

## 🎉 完成！

按照以上步骤操作后，您的应用就部署成功了！ 🚀

记得分享给朋友使用！ 😊

