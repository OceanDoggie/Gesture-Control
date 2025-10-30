/**
 * WebSocket 服务：前端 <-> Node <-> Python 的实时桥接（仅初始化一次）
 * 中文注释说明：
 * - 只“附着”到外部的 HTTP server（由 index.ts 创建并 listen）
 * - 不再创建第二个独立端口，避免重复 handleUpgrade / EADDRINUSE
 * - 保留心跳、日志、PythonShell 通信，并避免 TS 的 downlevelIteration 报错
 */

import type http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { PythonShell } from "python-shell";

const WS_PATH = "/ws/gesture";        // 前端用的 WS 路径
const HEARTBEAT_MS = 30_000;          // 心跳间隔

interface GestureMessage {
  type: "gesture_data" | "frame_data" | "start_recognition" | "stop_recognition";
  data?: any;
  frame?: string;
  target_gesture?: string;
}

interface ClientConnection {
  ws: WebSocket;
  isRecognizing: boolean;
  targetGesture?: string;
  lastPongTs: number;
  latestFrame?: string;  // 仅保存最新帧，旧帧会被覆盖
}

export class GestureWebSocketService {
  // 仅一个 WSS 实例
  private wss: WebSocketServer;
  private httpServer: http.Server;
  private clients: Map<string, ClientConnection> = new Map();
  private pythonProcess: PythonShell | null = null;
  private heartBeatTimer: NodeJS.Timeout | null = null;

  /**
   * 只附着到外部 server（由 index.ts 传入）
   */
  constructor(externalServer: http.Server) {
    this.httpServer = externalServer;

    console.log("🔗 Attaching Gesture WebSocket to existing HTTP server...");
    
    // 打印当前 upgrade 监听数量，便于调试
    const beforeCount = this.httpServer.listenerCount("upgrade");
    console.log(`🔍 WS upgrade listeners count (before): ${beforeCount}`);

    // 只初始化一次 WebSocketServer —— 使用"附着到同一个 HTTP server"的方式
    this.wss = new WebSocketServer({
      server: this.httpServer,
      path: WS_PATH,  // /ws/gesture
    });

    // 确认 WebSocket 成功挂载
    const afterCount = this.httpServer.listenerCount("upgrade");
    console.log(`🔍 WS upgrade listeners count (after): ${afterCount}`);
    
    // ✅ 说明：开发环境下通常有 2 个监听器（Vite HMR + Gesture WS）
    if (afterCount === 2) {
      console.log(`✅ 正常：Vite HMR (/__vite_hmr) + Gesture WS (/ws/gesture) 共存`);
    } else if (afterCount > 2) {
      console.warn(`⚠️  警告：检测到 ${afterCount} 个 upgrade 监听器，可能存在重复初始化！`);
    }

    this.setupWebSocketHandlers();
    this.setupPythonProcess();
    this.startHeartbeat();
  }

  // ====================== WS 处理 ======================

  private setupWebSocketHandlers() {
    // ✅ 全局错误处理，防止未捕获错误导致进程崩溃
    this.wss.on("error", (err: Error) => {
      console.error("❌ [WS Server Error]", err.message);
      // 不要退出进程，只记录错误
    });

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();
      
      // 打印连接详细信息，用于调试
      console.log(`\n✅ WebSocket client connected: ${clientId}`);
      console.log(`   📍 URL: ${req.url}`);
      console.log(`   🌐 Origin: ${req.headers.origin || 'N/A'}`);
      console.log(`   🔑 Host: ${req.headers.host || 'N/A'}`);
      console.log(`   📊 Total clients: ${this.clients.size + 1}\n`);

      this.clients.set(clientId, {
        ws,
        isRecognizing: false,
        lastPongTs: Date.now(),
      });

      this.safeSend(ws, {
        type: "connection_established",
        clientId,
        message: "WebSocket connected",
      });

      ws.on("message", (data: Buffer) => {
        try {
          const msg: GestureMessage = JSON.parse(data.toString());
          this.handleClientMessage(clientId, msg);
        } catch (err) {
          console.error(`❌ WS message parse error:`, err);
          this.safeSend(ws, { type: "error", message: "Invalid JSON message" });
        }
      });

      ws.on("pong", () => {
        const c = this.clients.get(clientId);
        if (c) c.lastPongTs = Date.now();
      });

      ws.on("close", (_code: number) => {
        console.log(`🔌 WS client closed: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on("error", (e) => {
        console.error(`❌ WS error (${clientId}):`, e.message || e);
        // ✅ 安全清理，不让错误传播导致进程退出
        try {
          this.clients.delete(clientId);
        } catch (cleanupErr) {
          console.error("Failed to cleanup client:", cleanupErr);
        }
      });
    });
  }

  // ====================== Python 子进程 ======================

  private setupPythonProcess() {
    // ✅ 环境开关：PY_WORKER_ENABLED（默认 false，避免生产环境依赖问题）
    const pyEnabled = process.env.PY_WORKER_ENABLED === "true";
    
    if (!pyEnabled) {
      console.log("⚠️  Python worker disabled (PY_WORKER_ENABLED=false)");
      console.log("   手势识别将不可用，但服务器继续运行");
      this.pythonProcess = null;
      return; // ✅ 直接返回，不启动 Python，服务器继续运行
    }

    // 🔵 开发环境：正常启动 Python 手势识别服务
    try {
      const scriptPath = path.join(
        process.cwd(),
        "server",
        "ml",
        "realtime_recognition.py"
      );
      console.log(`🐍 Starting Python: ${scriptPath}`);

      this.pythonProcess = new PythonShell(scriptPath, {
        mode: "text",
        pythonPath: "python", // Windows 环境通常就是 python
        args: [],
      });

      // Python 按行输出
      this.pythonProcess.on("message", (line: string) => {
        try {
          const obj = JSON.parse(line);
          if (obj.type === "status" || obj.type === "ready") {
            console.log(`🐍 ${obj.message || "Python ready"}`);
          } else {
            console.log(`🐍 Python result:`, obj);
          }
          this.broadcastGestureResult(obj);
        } catch {
          // 过滤冗余日志
          if (
            !line.includes("WARNING") &&
            !line.startsWith("INFO:") &&
            !line.includes("W0000")
          ) {
            console.warn(`🐍 [raw] ${line}`);
          }
        }
      });

      this.pythonProcess.on("stderr", (stderr: string) => {
        if (!stderr.includes("WARNING") && !stderr.includes("W0000")) {
          console.error(`🐍 stderr: ${stderr}`);
        }
      });

      this.pythonProcess.on("close", (code: number) => {
        console.log(`🐍 Python exited with code: ${code}`);
        this.pythonProcess = null;
      });

      this.pythonProcess.on("error", (err: Error) => {
        console.error(`❌ Python error: ${err.message}`);
        this.pythonProcess = null;
        // ✅ 不要退出主进程，只是记录错误
      });

      console.log("✅ Python gesture service started");
    } catch (error) {
      console.error(`❌ Failed to start Python:`, error);
      console.error(
        `👉 Make sure dependencies are installed: pip install mediapipe opencv-python numpy joblib scikit-learn`
      );
      // ✅ Python 启动失败不影响 HTTP/WebSocket 服务
      this.pythonProcess = null;
    }
  }

  // ====================== 业务逻辑 ======================

  private handleClientMessage(clientId: string, message: GestureMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case "start_recognition": {
        client.isRecognizing = true;
        client.targetGesture = message.target_gesture;
        this.sendToClient(clientId, {
          type: "recognition_started",
          target_gesture: message.target_gesture,
          message: "Start recognition",
        });
        break;
      }
      case "stop_recognition": {
        client.isRecognizing = false;
        client.targetGesture = undefined;
        this.sendToClient(clientId, {
          type: "recognition_stopped",
          message: "Stop recognition",
        });
        break;
      }
      case "frame_data": {
        if (client.isRecognizing && message.frame) {
          this.processFrame(clientId, message.frame, client.targetGesture);
        }
        break;
      }
      default:
        this.sendToClient(clientId, { type: "error", message: "Unknown message type" });
    }
  }

  private processFrame(clientId: string, frameData: string, target?: string) {
    const client = this.clients.get(clientId);
    if (!client || !this.pythonProcess) return;

    // ⚠️ 性能优化：仅保存最新帧，不排队处理旧帧（避免延迟累积）
    client.latestFrame = frameData;
    client.targetGesture = target;

    // 立即处理最新帧（如果 Python 空闲）
    this.processLatestFrame(clientId);
  }

  private processLatestFrame(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client || !client.latestFrame || !this.pythonProcess) return;

    const payload = {
      type: "process_frame",
      client_id: clientId,
      frame: client.latestFrame,
      target_gesture: client.targetGesture || ""
    };

    try {
      this.pythonProcess.send(JSON.stringify(payload));
      // 清空最新帧，避免重复处理
      client.latestFrame = undefined;
    } catch (e) {
      console.error("❌ send to Python failed:", e);
      this.sendToClient(clientId, { type: "error", message: "Send to Python failed" });
    }
  }

  private broadcastGestureResult(result: any) {
    // 用 forEach，避免 TS 的 downlevelIteration 报错
    this.clients.forEach((client, clientId) => {
      if (client.isRecognizing && client.ws.readyState === WebSocket.OPEN) {
        this.safeSend(client.ws, { type: "gesture_result", ...result });
      }
    });
  }

  private sendToClient(clientId: string, message: any) {
    const c = this.clients.get(clientId);
    if (!c || c.ws.readyState !== WebSocket.OPEN) return;
    this.safeSend(c.ws, message);
  }

  private safeSend(ws: WebSocket, data: any) {
    try {
      ws.send(JSON.stringify(data));
    } catch (e) {
      console.error("❌ WS send failed:", e);
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // ====================== 心跳保活 ======================

  private startHeartbeat() {
    if (this.heartBeatTimer) clearInterval(this.heartBeatTimer);
    this.heartBeatTimer = setInterval(() => {
      const now = Date.now();
      // 用 forEach 避免 Map 的 for...of 触发 ts(2802)
      this.clients.forEach((c, id) => {
        // 两个心跳周期没响应就断开
        if (now - c.lastPongTs > HEARTBEAT_MS * 2) {
          try { c.ws.terminate(); } catch {}
          this.clients.delete(id);
          console.warn(`⚠️  Terminated stale client: ${id}`);
          return;
        }
        try { c.ws.ping(); } catch {}
      });
    }, HEARTBEAT_MS);
  }

  // ====================== 关闭清理 ======================

  public getConnectionStats() {
    let active = 0;
    this.clients.forEach(c => { if (c.isRecognizing) active++; });
    return { total_clients: this.clients.size, active_recognition: active };
  }

  public close() {
    if (this.heartBeatTimer) clearInterval(this.heartBeatTimer);
    this.clients.forEach((c) => { try { c.ws.close(); } catch {} });
    this.clients.clear();
    if (this.pythonProcess) { try { this.pythonProcess.kill(); } catch {} this.pythonProcess = null; }
    try { this.wss.close(); } catch {}
    console.log("🛑 WS service closed.");
  }
}
