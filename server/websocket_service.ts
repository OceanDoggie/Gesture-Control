/**
 * WebSocket服务 - 用于实时手势识别通信
 */
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { PythonShell } from 'python-shell';
import { log } from './vite';
import path from 'path';
import { fileURLToPath } from 'url';

interface GestureMessage {
  type: 'gesture_data' | 'frame_data' | 'start_recognition' | 'stop_recognition';
  data?: any;
  frame?: string; // base64 encoded frame
  target_gesture?: string;
}

interface ClientConnection {
  ws: WebSocket;
  isRecognizing: boolean;
  targetGesture?: string;
}

class GestureWebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private pythonProcess: PythonShell | null = null;

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/gesture'
    });

    this.setupWebSocketHandlers();
    this.setupPythonProcess();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();
      log(`🔗 新的手势识别客户端连接: ${clientId}`);

      // 存储客户端连接
      this.clients.set(clientId, {
        ws,
        isRecognizing: false
      });

      // 发送连接确认
      this.sendToClient(clientId, {
        type: 'connection_established',
        clientId,
        message: '手势识别服务已连接'
      });

      // 处理客户端消息
      ws.on('message', (data: Buffer) => {
        try {
          const message: GestureMessage = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          log(`❌ 解析客户端消息失败: ${error}`);
          this.sendToClient(clientId, {
            type: 'error',
            message: '消息格式错误'
          });
        }
      });

      // 处理客户端断开连接
      ws.on('close', () => {
        log(`🔌 客户端断开连接: ${clientId}`);
        this.clients.delete(clientId);
      });

      // 处理错误
      ws.on('error', (error) => {
        log(`❌ WebSocket错误: ${error}`);
        this.clients.delete(clientId);
      });
    });
  }

  private setupPythonProcess() {
    // 启动Python手势识别进程 - 使用带评分系统的版本
    try {
      // 使用绝对路径确保无论从哪里启动都能找到Python脚本
      const scriptPath = path.join(process.cwd(), 'server', 'ml', 'realtime_recognition_with_scoring.py');
      
      log(`🐍 正在启动Python脚本: ${scriptPath}`);
      
      this.pythonProcess = new PythonShell(scriptPath, {
        mode: 'text', // 使用文本模式，因为Python脚本输出JSON字符串
        pythonPath: 'python', // 确保Python环境正确
        args: []
      });

      // 处理Python进程输出
      this.pythonProcess.on('message', (message: any) => {
        try {
          // Python输出的是JSON字符串，需要解析
          const result = typeof message === 'string' ? JSON.parse(message) : message;
          
          // 只在非状态消息时记录详细日志
          if (result.type !== 'ready' && result.type !== 'status') {
            log(`🐍 Python识别结果: ${JSON.stringify(result)}`);
          } else {
            log(`🐍 ${result.message || 'Python服务就绪'}`);
          }
          
          this.broadcastGestureResult(result);
        } catch (error) {
          log(`❌ 解析Python输出失败: ${error} - 原始消息: ${message}`);
        }
      });

      // 处理Python进程错误
      this.pythonProcess.on('stderr', (stderr: string) => {
        // 过滤MediaPipe的warning信息，只显示真正的错误
        if (!stderr.includes('WARNING') && !stderr.includes('W0000')) {
          log(`🐍 Python错误: ${stderr}`);
        }
      });

      // 处理Python进程关闭
      this.pythonProcess.on('close', (code: number) => {
        log(`🐍 Python进程已关闭，退出码: ${code}`);
        this.pythonProcess = null;
      });

      // 处理Python进程错误
      this.pythonProcess.on('error', (error: Error) => {
        log(`❌ Python进程错误: ${error.message}`);
        this.pythonProcess = null;
      });

      log('✅ Python手势识别服务（带评分系统）已启动');
    } catch (error) {
      log(`❌ 启动Python服务失败: ${error}`);
      log(`   请确保Python已安装且所有依赖包已安装`);
      log(`   运行命令: pip install mediapipe opencv-python numpy joblib scikit-learn pandas`);
    }
  }

  private handleClientMessage(clientId: string, message: GestureMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'start_recognition':
        client.isRecognizing = true;
        client.targetGesture = message.target_gesture;
        this.sendToClient(clientId, {
          type: 'recognition_started',
          target_gesture: message.target_gesture,
          message: '开始手势识别'
        });
        break;

      case 'stop_recognition':
        client.isRecognizing = false;
        client.targetGesture = undefined;
        this.sendToClient(clientId, {
          type: 'recognition_stopped',
          message: '停止手势识别'
        });
        break;

      case 'frame_data':
        if (client.isRecognizing && message.frame) {
          this.processFrame(clientId, message.frame);
        }
        break;

      default:
        log(`❓ 未知消息类型: ${message.type}`);
    }
  }

  private async processFrame(clientId: string, frameData: string) {
    try {
      // 发送帧数据到Python进程进行处理
      if (this.pythonProcess) {
        const message = {
          type: 'process_frame',
          client_id: clientId,
          frame: frameData  // Python脚本期望的字段名是'frame'而不是'frame_data'
        };
        
        // 发送JSON消息到Python的stdin
        this.pythonProcess.send(JSON.stringify(message) + '\n');
      }
    } catch (error) {
      log(`❌ 处理帧数据失败: ${error}`);
      this.sendToClient(clientId, {
        type: 'error',
        message: '处理视频帧失败'
      });
    }
  }

  private broadcastGestureResult(result: any) {
    // 广播手势识别结果给所有活跃的客户端
    this.clients.forEach((client, clientId) => {
      if (client.isRecognizing) {
        this.sendToClient(clientId, {
          type: 'gesture_result',
          ...result
        });
      }
    });
  }

  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        log(`❌ 发送消息失败: ${error}`);
        this.clients.delete(clientId);
      }
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取连接统计
  getConnectionStats() {
    return {
      total_clients: this.clients.size,
      active_recognition: Array.from(this.clients.values()).filter(c => c.isRecognizing).length
    };
  }

  // 关闭服务
  close() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
    }
    this.wss.close();
  }
}

export { GestureWebSocketService };
