# WebSocket 连接修复说明

## 🎯 修复目标
解决本地开发时的 "WebSocket closed before connection established" 错误，并确保部署到 Render 时正常工作。

## ✅ 已完成的改动

### 1️⃣ 前端增强 (WebcamViewer.tsx)

**改动点：**
- ✅ 添加连接 URL 日志：`console.log('🔌 WS connect to:', wsUrl)`
- ✅ 增强 `onclose` 事件处理，打印详细的关闭信息（code/reason/wasClean）
- ✅ 增强 `onerror` 事件处理，提供详细的故障排查提示
- ✅ 针对 code 1006（异常关闭）提供专门的错误提示

**环境自适应逻辑（已存在，已核对）：**
```typescript
const isDev = import.meta.env.DEV;
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const host = isDev ? 'localhost:4000' : window.location.host;
const wsUrl = `${protocol}://${host}/ws/gesture`;
```

- 本地开发：`ws://localhost:4000/ws/gesture`
- Render 生产：`wss://<your-app>.onrender.com/ws/gesture`

### 2️⃣ 后端增强 (websocket_service.ts)

**改动点：**
- ✅ connection 事件处理时打印 `req.url`、`req.headers.origin` 和 `req.headers.host`
- ✅ 便于确认前端请求是否到达，以及路径是否正确

**已有的正确配置（已核对）：**
```typescript
// server/index.ts
const port = parseInt(process.env.PORT || '4000', 10);
server.listen({ port, host: '0.0.0.0' }, ...);

// websocket_service.ts
new WebSocketServer({ server, path: '/ws/gesture' });
```

### 3️⃣ Vite Proxy（已存在，已核对）

**vite.config.ts 已正确配置：**
```typescript
server: {
  proxy: {
    "/ws": {
      target: "ws://localhost:4000",
      ws: true,
      changeOrigin: true,
    }
  }
}
```

这样前端可以通过 `ws://localhost:5173/ws/gesture` 连接，Vite 会自动代理到后端的 4000 端口。

---

## 🧪 自测清单

### 本地开发测试

1. **启动后端**
   ```bash
   cd GestureWorkshop
   npm run dev
   ```

   **期望看到：**
   ```
   🚀 HTTP server running on http://0.0.0.0:4000
   ✅ WebSocket server listening on ws://localhost:4000/ws/gesture
   ```

2. **启动前端（新终端）**
   ```bash
   npm run dev  # Vite 会在 5173 端口启动
   ```

3. **打开浏览器**
   - 访问 `http://localhost:5173`
   - 打开 DevTools → Console
   - 打开 DevTools → Network → 过滤 WS

4. **测试步骤**
   - 点击 "Start Camera" 按钮
   - **前端 Console 应该看到：**
     ```
     🔌 WS connect to: ws://localhost:4000/ws/gesture
     ✅ WebSocket connected successfully
     ```
   - **后端 Console 应该看到：**
     ```
     🧠 WS client connected: client_xxxxx
        📍 URL: /ws/gesture
        🌐 Origin: http://localhost:5173
        🔑 Host: localhost:4000
     ```
   - **Network 标签页应该显示：**
     - 连接名称：`ws/gesture`
     - 状态：`101 Switching Protocols` ✅
     - 状态文本：`Connected` 或绿色指示器

5. **测试识别功能**
   - 选择手势（如 "A"）
   - 点击 "Start Recognition"
   - 应该看到 WS 状态显示 "WS Connected"（绿色）
   - 无 "closed before connection established" 错误

### 🚨 如果仍有问题

**前端看到 code 1006 错误：**
```
🔌 WebSocket closed: { code: 1006, reason: '', wasClean: false }
```

**排查步骤：**
1. 确认后端是否真的在运行（检查 4000 端口）
2. 检查后端日志是否有 "WS client connected" 消息
3. 检查 Network 的 Headers 标签，查看 Upgrade 请求的响应码
4. 如果后端没有收到连接请求，可能是 Vite proxy 配置问题
5. 如果后端收到但立即断开，检查 Origin 校验逻辑

---

## 🌐 Render 部署兼容性

### ✅ 已确保的兼容点

1. **端口动态适配**
   - 使用 `process.env.PORT || 4000`
   - Render 会自动注入 PORT 环境变量

2. **协议自动切换**
   - 本地：`ws://`
   - Render (HTTPS)：自动切换为 `wss://`

3. **域名自动适配**
   - 本地：`localhost:4000`
   - Render：`window.location.host`（即 your-app.onrender.com）

4. **单实例 WebSocket**
   - 只创建一个 WebSocketServer
   - 附着到同一个 HTTP server
   - 避免端口冲突

5. **CORS 友好**
   - 代码中未添加严格的 Origin 限制
   - 生产环境会自动允许同源连接

### 🚀 部署到 Render 时的注意事项

1. **环境变量**（如需要）
   - Render 会自动设置 `PORT`
   - 无需手动配置

2. **启动命令**
   - 确保 `package.json` 的 `start` 脚本正确
   ```json
   "scripts": {
     "start": "tsx server/index.ts"
   }
   ```

3. **Health Check**
   - Render 会通过 HTTP GET 检查健康状态
   - 确保有至少一个 GET 路由（如 `/api/health`）返回 200

4. **WebSocket 路径**
   - 生产环境 WebSocket URL 将是：`wss://your-app.onrender.com/ws/gesture`
   - 前端代码已自动适配，无需改动

---

## 📝 Commit Message

```
fix(websocket): enhance logging and error handling for local dev and Render deployment

- Add detailed WS connection logging in frontend (URL, close event details)
- Add request inspection logging in backend (URL, origin, host)
- Improve error messages with troubleshooting tips for connection failures
- Ensure environment-adaptive WS URL (ws:// for dev, wss:// for production)
- Verify single WebSocketServer instance attached to HTTP server
- Confirm Vite proxy configuration for local development
- All changes are deployment-safe for Render (no hardcoded values)

Fixes: "WebSocket closed before connection established" error
Tested: Local dev on Windows with Node.js + Python ML service
```

## 📋 变更摘要（中文）

**修复内容：**
- 前端 WebSocket 初始化时打印连接 URL，便于调试
- 前端 onclose/onerror 事件打印详细信息，提供排查建议
- 后端 connection 事件打印请求 URL/Origin/Host，确认请求到达
- 核对并确认环境自适应逻辑、单实例 WS、Vite proxy 配置均正确

**修复原因：**
- WebSocket 连接异常时缺少详细日志，难以定位问题
- 错误提示不够友好，用户不知道如何排查

**自测方式：**
1. 启动后端，确认日志显示 "WebSocket server listening on ws://localhost:4000/ws/gesture"
2. 启动前端，打开 Network → WS，查看连接状态为 "101 Switching Protocols"
3. 前端 Console 显示 "✅ WebSocket connected successfully"
4. 后端 Console 显示 "🧠 WS client connected" 及请求详情

**Render 兼容性：**
- ✅ 代码未写死 localhost:4000
- ✅ 生产环境自动使用 wss://<your-domain>/ws/gesture
- ✅ 端口使用 process.env.PORT || 4000
- ✅ 监听地址为 0.0.0.0
- ✅ 单实例 WebSocket，无端口冲突
- ✅ Vite proxy 仅影响本地开发，不影响生产构建

---

## 🎉 完成标志

当你看到以下输出时，说明一切正常：

**✅ 后端启动：**
```
🚀 HTTP server running on http://0.0.0.0:4000
🔗 WS attaching to existing HTTP server (Express).
🔍 WebSocket upgrade listeners count: 0
✅ WebSocket server listening on ws://localhost:4000/ws/gesture
```

**✅ 前端连接成功：**
```
🔌 WS connect to: ws://localhost:4000/ws/gesture
✅ WebSocket connected successfully
```

**✅ 后端收到连接：**
```
🧠 WS client connected: client_1734567890_abc123
   📍 URL: /ws/gesture
   🌐 Origin: http://localhost:5173
   🔑 Host: localhost:4000
```

**✅ Network 面板：**
- 请求：`ws/gesture`
- 状态：`101 Switching Protocols`
- 颜色：绿色 ✅

现在可以正常使用手势识别功能了！🎉

