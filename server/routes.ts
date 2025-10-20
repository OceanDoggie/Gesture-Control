import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  processGesture, 
  getGestureInstructions, 
  getAllGestures, 
  getServiceStatus 
} from "./gesture_api";

export async function registerRoutes(app: Express): Promise<Server> {
  // 创建HTTP服务器
  const httpServer = createServer(app);

  // API路由 - 手势识别相关
  app.post('/api/gesture/process', processGesture);
  app.get('/api/gesture/instructions/:gesture', getGestureInstructions);
  app.get('/api/gesture/list', getAllGestures);
  app.get('/api/gesture/status', getServiceStatus);

  // 健康检查端点
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        websocket: 'active',
        gesture_recognition: 'active'
      }
    });
  });

  // Render.com 健康检查端点
  app.get('/healthz', (req, res) => {
    res.send('ok');
  });

  // 获取WebSocket连接统计
  app.get('/api/gesture/stats', (req, res) => {
    res.json({
      success: true,
      data: {
        connections: 0,
        active: 0
      }
    });
  });

  // 处理进程退出
  process.on('SIGINT', () => {});
  process.on('SIGTERM', () => {});

  return httpServer;
}
