import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupFrontend, log } from "./vite.js";
// ✅ 新增：引入 WebSocket 服务
import { GestureWebSocketService } from "./websocket_service";
// ✅ CORS：允许前端域名访问 API
import cors from "cors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ CORS 配置：允许指定来源访问 API（支持环境变量配置）
const allowedOrigins =
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean).length > 0
    ? (process.env.ALLOWED_ORIGINS as string).split(",").map(s => s.trim())
    : [
        "https://gesture-control-xli6.onrender.com",  // 生产环境前端
        "http://localhost:5173"                        // 本地开发
      ];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// 处理预检请求（OPTIONS）
app.options(
  "*",
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// （中文说明）这段是 API 日志中间件，不动
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  // （中文说明）registerRoutes 会返回一个 http.Server（你的工程里就是这个约定）
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // ✅ 统一的前端服务设置：生产环境走静态文件（dist），开发环境用 Vite 热更新
  await setupFrontend(app, server);

  // ✅ 关键：把 WebSocket 服务"挂载"到同一个 server 上（与 Express 复用端口）
  //    这行之前一直缺失，导致前端连不上 ws://localhost:4000/ws/gesture
  new GestureWebSocketService(server);

  // ✅ 监听 4000 (或 PORT)，并承载 API + 前端 + WebSocket
  // Environment-adaptive server listener (works on both local & Render)
  const port = parseInt(process.env.PORT || '4000', 10);

  // 启动服务器并处理端口冲突错误
  server.listen({ port, host: '0.0.0.0' })
    .on('listening', () => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🚀 HTTP server running on http://0.0.0.0:${port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n📡 WebSocket Endpoints:`);
      console.log(`   • Gesture Recognition: ws://localhost:${port}/ws/gesture`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`   • Vite HMR (dev only): ws://localhost:${port}/__vite_hmr`);
      }
      console.log(`\n✨ Server is ready! Visit http://localhost:${port}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    })
    .on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ 端口 ${port} 已被占用！`);
        console.error(`\n🔧 请执行以下步骤解决：`);
        console.error(`   1. 查找占用端口的进程：`);
        console.error(`      Windows: netstat -ano | findstr :${port}`);
        console.error(`      Linux/Mac: lsof -ti:${port}`);
        console.error(`\n   2. 终止占用端口的进程：`);
        console.error(`      Windows: taskkill /F /PID <PID>`);
        console.error(`      Linux/Mac: kill -9 <PID>`);
        console.error(`\n   3. 或者使用不同的端口：`);
        console.error(`      PORT=3000 npm run dev\n`);
        process.exit(1);
      } else {
        console.error(`\n❌ 服务器启动失败:`, err);
        process.exit(1);
      }
    });

})();
