/**
 * 简化的WebSocket服务 - 直接处理手势识别
 */
import { WebSocketServer, WebSocket } from 'ws';
import { log } from './vite';

interface ClientConnection {
  ws: WebSocket;
  isRecognizing: boolean;
  targetGesture?: string;
}

class SimpleGestureWebSocket {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/gesture'
    });

    this.setupHandlers();
    log('🔗 WebSocket服务已启动');
  }

  private setupHandlers() {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      log(`✅ 客户端连接: ${clientId}`);

      this.clients.set(clientId, {
        ws,
        isRecognizing: false
      });

      // 发送连接确认
      this.send(ws, {
        type: 'connection_established',
        clientId,
        message: '✅ WebSocket已连接'
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          log(`❌ 消息解析错误: ${error}`);
        }
      });

      ws.on('close', () => {
        log(`🔌 客户端断开: ${clientId}`);
        this.clients.delete(clientId);
      });
    });
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'start_recognition':
        client.isRecognizing = true;
        client.targetGesture = message.target_gesture;
        log(`🎯 开始识别手势: ${message.target_gesture}`);
        this.send(client.ws, {
          type: 'recognition_started',
          target_gesture: message.target_gesture,
          message: `开始识别手势 ${message.target_gesture}`
        });
        break;

      case 'stop_recognition':
        client.isRecognizing = false;
        log(`⏹️ 停止识别`);
        this.send(client.ws, {
          type: 'recognition_stopped'
        });
        break;

      case 'frame_data':
        if (client.isRecognizing) {
          // 模拟AI识别结果（包含打分系统）
          const confidence = 0.7 + Math.random() * 0.25; // 70-95%
          let grade = 'D';
          let gradeDescription = '需要改进';
          
          if (confidence >= 0.9) {
            grade = 'A';
            gradeDescription = '优秀';
          } else if (confidence >= 0.75) {
            grade = 'B';
            gradeDescription = '良好';
          } else if (confidence >= 0.6) {
            grade = 'C';
            gradeDescription = '合格';
          }
          
          this.send(client.ws, {
            type: 'gesture_result',
            hands_detected: true,
            gestures: [{
              gesture: client.targetGesture || 'M',
              confidence: confidence,
              confidence_percent: Math.round(confidence * 100),
              grade: grade,
              grade_description: gradeDescription,
              message: `检测到手势: ${client.targetGesture || 'M'} - 评分: ${grade}`,
              hand_id: 0
            }]
          });
        }
        break;
    }
  }

  private send(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectionStats() {
    return {
      total_clients: this.clients.size,
      active_recognition: Array.from(this.clients.values()).filter(c => c.isRecognizing).length
    };
  }

  close() {
    this.wss.close();
  }
}

export { SimpleGestureWebSocket };
