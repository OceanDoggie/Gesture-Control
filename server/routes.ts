import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GestureWebSocketService } from "./websocket_service"; // 使用真正的AI识别服务
import { 
  processGesture, 
  getGestureInstructions, 
  getAllGestures, 
  getServiceStatus 
} from "./gesture_api";

export async function registerRoutes(app: Express): Promise<Server> {
  // 创建HTTP服务器
  const httpServer = createServer(app);

  // 初始化WebSocket服务（集成Python AI模型）
  const gestureWebSocketService = new GestureWebSocketService(httpServer);

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

  // 获取WebSocket连接统计
  app.get('/api/gesture/stats', (req, res) => {
    const stats = gestureWebSocketService.getConnectionStats();
    res.json({
      success: true,
      data: stats
    });
  });

  // 清理函数
  const cleanup = () => {
    gestureWebSocketService.close();
  };

  // 处理进程退出
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return httpServer;
}
