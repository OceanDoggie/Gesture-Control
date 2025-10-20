# Render 部署指南 🚀

本指南将帮助您将 GestureWorkshop 部署到 Render.com。

## ✅ 已完成的代码修改

### 1. 后端端口和健康检查 ✓
- ✅ `server/index.ts` 已使用 `process.env.PORT || 4000`
- ✅ `server/routes.ts` 已添加 `/healthz` 路由返回 "ok"

### 2. Python 子进程环境变量 ✓
- ✅ `server/gesture_api.ts` 已改为使用：
  - `PYTHON_BIN`（默认 python3）
  - `MODEL_DIR`（默认 server/ml）
- ✅ 已添加 stdout/stderr 日志输出到 console

### 3. 前端 API 基础 URL ✓
- ✅ `client/src/components/WebcamViewer.tsx` 已改为读取 `VITE_API_BASE`
- ✅ WebSocket 和 API 调用都已支持环境变量配置
- ✅ 保留了回退逻辑（本地开发时自动使用 localhost:4000）

### 4. Render Blueprint 配置 ✓
- ✅ 已创建 `render.yaml` 配置文件
- ✅ 包含两个服务：`gesture-api`（后端）和 `gesture-client`（前端）
- ✅ 已配置健康检查、构建命令、环境变量等

### 5. 模型下载脚本 ✓
- ✅ 已创建 `scripts/download-models.js`
- ✅ 已集成到 `build` 和 `start` 命令
- ✅ 支持 curl/wget 自动下载
- ✅ 支持 `MODEL_DOWNLOAD_URL` 环境变量

---

## 📋 部署步骤

### 第 1 步：提交并推送代码

```bash
cd GestureWorkshop
git add .
git commit -m "feat: 配置 Render 部署支持"
git push origin main
```

### 第 2 步：在 Render 创建 Blueprint 部署

1. 登录 [Render Dashboard](https://dashboard.render.com/)
2. 点击 **"New +"** → **"Blueprint"**
3. 连接您的 GitHub 仓库
4. 选择 `GestureWorkshop` 仓库
5. Render 会自动检测 `render.yaml` 并创建两个服务：
   - `gesture-api`（后端 Web Service）
   - `gesture-client`（前端 Static Site）

### 第 3 步：等待初次部署完成

部署完成后，您会获得两个 URL：
- **后端**: `https://gesture-api.onrender.com`（示例）
- **前端**: `https://gesture-client.onrender.com`（示例）

### 第 4 步：配置环境变量并重新部署

#### 4.1 配置后端服务 (`gesture-api`)

进入 `gesture-api` 服务设置 → Environment：

```
CORS_ORIGIN=https://gesture-client.onrender.com
PYTHON_BIN=python3
MODEL_DIR=/opt/render/project/src/server/ml
MODEL_DOWNLOAD_URL=<你的模型下载地址>  # 可选
```

#### 4.2 配置前端服务 (`gesture-client`)

进入 `gesture-client` 服务设置 → Environment：

```
VITE_API_BASE=https://gesture-api.onrender.com
```

#### 4.3 触发重新部署

1. 保存环境变量后，点击 **"Manual Deploy"** → **"Deploy latest commit"**
2. 两个服务都需要重新部署

---

## 🐍 Python 依赖安装（可选）

如果您的后端需要 Python 运行时，需要在 Render 服务中配置：

### 方法 1：使用 Render 的 Native Environment

在 `render.yaml` 中添加（适用于同时需要 Node + Python 的场景）：

```yaml
services:
  - type: web
    name: gesture-api
    runtime: python
    buildCommand: |
      pip install -r requirements.txt
      npm install
      npm run build
    startCommand: npm start
```

### 方法 2：使用 Docker（推荐用于复杂环境）

创建 `Dockerfile`：

```dockerfile
FROM node:18-bullseye

# 安装 Python
RUN apt-get update && apt-get install -y python3 python3-pip

# 安装 Python 依赖
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# 安装 Node 依赖
COPY package*.json .
RUN npm install

# 复制源代码
COPY . .

# 构建
RUN npm run build

CMD ["npm", "start"]
```

---

## 🔍 验证部署

### 检查后端健康状态

```bash
curl https://gesture-api.onrender.com/healthz
# 应返回: ok
```

### 检查 WebSocket 连接

打开浏览器控制台，访问前端 URL，查看 WebSocket 连接日志：

```
[WS] Connecting to: wss://gesture-api.onrender.com/ws/gesture
[WS] ✅ Connected to backend
```

### 检查 API 调用

```bash
curl https://gesture-api.onrender.com/api/gesture/status
```

---

## 🛠️ 常见问题

### 1. 模型文件下载失败

**问题**: 日志显示 "模型下载失败"

**解决方案**:
- 确认 `MODEL_DOWNLOAD_URL` 环境变量正确设置
- 如果模型较大，考虑将模型文件直接提交到 Git（不推荐）或使用 Render Disk 持久化存储
- 或者在 Render 控制台手动上传模型文件

### 2. Python 进程启动失败

**问题**: `Python服务未启动`

**解决方案**:
- 检查 `PYTHON_BIN` 环境变量（默认 `python3`）
- 检查 `MODEL_DIR` 路径是否正确
- 查看 Render 日志中的 Python stderr 输出

### 3. CORS 错误

**问题**: 前端无法访问后端 API

**解决方案**:
- 确认 `CORS_ORIGIN` 已设置为前端 URL
- 确认 `VITE_API_BASE` 已设置为后端 URL
- 重新部署两个服务

### 4. WebSocket 连接失败

**问题**: `[WS] ❌ Closed (code: 1006)`

**解决方案**:
- 检查后端日志，确认 WebSocket 服务已启动
- 确认前端使用的是 `wss://`（HTTPS 环境）或 `ws://`（HTTP 环境）
- 检查 Render 防火墙规则

---

## 📊 性能优化建议

1. **启用 Render 的 CDN**（Static Sites 自动启用）
2. **使用 Free Plan 限制**:
   - Free plan 会在 15 分钟无活动后休眠
   - 首次唤醒需要 30-60 秒
   - 考虑升级到 Starter Plan（$7/月）以获得持续运行
3. **优化模型大小**: 考虑使用量化或压缩后的模型文件
4. **使用 Render Disk**: 持久化存储模型文件（避免每次部署重新下载）

---

## 📞 获取帮助

- Render 文档: https://render.com/docs
- Render 社区: https://community.render.com/
- GitHub Issues: 在您的仓库创建 issue

---

## 🎉 部署完成！

完成以上步骤后，您的 GestureWorkshop 应该已经成功部署到 Render.com 了！

访问前端 URL 开始使用您的手势识别应用吧！ 🎮

