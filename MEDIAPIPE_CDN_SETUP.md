# MediaPipe CDN 配置指南

## 📋 概述

本项目支持两种手势识别模式：

1. **后端模式**（默认）：前端发送视频帧 → 后端 Python/MediaPipe 处理
2. **前端模式**（推荐生产环境）：前端直接使用 MediaPipe（CDN 加载）

## 🎯 为什么使用 CDN？

### 问题
- Render 等平台的静态文件路径可能导致 404
- `node_modules` 中的 wasm/模型文件在生产构建后路径错误
- 导致 "No hand detected" 持续显示

### 解决方案
使用 CDN（如 jsDelivr）直接加载 MediaPipe 资源：
- ✅ 稳定可靠，无需打包 wasm 文件
- ✅ 全球 CDN 加速
- ✅ 自动版本管理

## 🔧 启用前端 MediaPipe

### 1. 设置环境变量

在项目根目录创建 `.env` 文件：

```bash
# 启用前端 MediaPipe（使用 CDN）
VITE_USE_FRONTEND_MP=true

# 如果使用后端模式，确保后端 URL 正确
VITE_API_BASE=https://your-backend.onrender.com
```

### 2. 前端使用示例

```typescript
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';

function YourComponent() {
  const { isReady, processFrame } = useMediaPipeHands({
    enabled: import.meta.env.VITE_USE_FRONTEND_MP === 'true',
    onResults: (results) => {
      // 处理手势识别结果
      if (results.multiHandLandmarks) {
        console.log('检测到手部关键点:', results.multiHandLandmarks);
      }
    },
  });

  // 在视频帧循环中调用
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isReady) {
        processFrame(videoRef.current);
      }
    }, 50); // 20 FPS

    return () => clearInterval(interval);
  }, [isReady]);
}
```

### 3. CDN 资源路径

项目自动从以下 CDN 加载：

```
https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/
  ├── hands.js
  ├── hands_solution_packed_assets_loader.js
  ├── hands_solution_simd_wasm_bin.js
  └── hands_solution_wasm_bin.wasm
```

## 📊 模式对比

| 特性 | 后端模式 | 前端模式（CDN） |
|------|---------|----------------|
| 延迟 | 较高（网络往返） | 低（本地处理） |
| 服务器负载 | 高 | 低 |
| 浏览器要求 | 低 | 需支持 WebAssembly |
| Python 依赖 | 是 | 否 |
| Render 部署 | 需 Python 环境 | 仅需 Node.js |
| 推荐场景 | 开发/测试 | 生产环境 |

## ⚙️ Render 部署配置

### 后端服务（如果使用后端模式）

```yaml
# render.yaml
services:
  - type: web
    name: gesture-backend
    env: node
    buildCommand: npm run build:server:render
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PY_WORKER_ENABLED
        value: false  # 关闭 Python，避免 502
      - key: PORT
        value: 4000
```

### 前端服务

```yaml
services:
  - type: static
    name: gesture-frontend
    buildCommand: npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_USE_FRONTEND_MP
        value: true  # 启用前端 MediaPipe
      - key: VITE_API_BASE
        value: https://gesture-backend.onrender.com
```

## 🐛 故障排查

### 1. "Failed to load wasm"

**原因**：CDN 被防火墙阻止或网络问题

**解决**：
- 检查浏览器控制台 Network 标签页
- 确保可以访问 `cdn.jsdelivr.net`
- 尝试切换 CDN（修改 `useMediaPipeHands.ts` 中的 `CDN_BASE`）

### 2. "No hand detected" 持续显示

**检查清单**：
- ✅ 摄像头权限已授予
- ✅ 光线充足
- ✅ 手部完整出现在画面中
- ✅ Console 无报错（按 F12 查看）
- ✅ Network 中 wasm 文件加载成功（200 状态）

### 3. 性能问题

**优化建议**：
- 降低视频分辨率（640x480）
- 降低处理帧率（15-20 FPS）
- 设置 `maxNumHands: 1`（仅识别一只手）
- 使用 `modelComplexity: 0`（牺牲精度换速度）

## 📝 验收标准

部署后检查：

```bash
# 1. 健康检查
curl https://your-backend.onrender.com/healthz
# 应返回: ok

# 2. 前端访问
open https://your-frontend.onrender.com

# 3. 浏览器控制台应显示
[MP] Loading from CDN: https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/...
[MP] ✅ MediaPipe Hands initialized successfully
[MP] Backend: @mediapipe/hands (CDN mode)

# 4. Network 标签页中看到 *.wasm 文件返回 200
```

## 🔗 相关链接

- [MediaPipe Hands 文档](https://google.github.io/mediapipe/solutions/hands.html)
- [jsDelivr CDN](https://www.jsdelivr.com/)
- [Render 部署指南](./RENDER_DEPLOY_GUIDE.md)

