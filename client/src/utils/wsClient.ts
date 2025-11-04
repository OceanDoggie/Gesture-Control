/**
 * WebSocket 重连工具
 * 实现指数退避重连策略，自动处理断线恢复
 */

export interface WSClientOptions {
  url: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  maxReconnectDelay?: number; // 最大重连延迟（毫秒）
  reconnectDecay?: number;    // 重连延迟增长因子
}

export class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000; // 默认最大 10 秒
  private reconnectDecay = 2;        // 默认指数因子 2
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  
  // 回调函数
  private onMessageCallback?: (data: any) => void;
  private onOpenCallback?: () => void;
  private onCloseCallback?: () => void;
  private onErrorCallback?: (error: Event) => void;

  constructor(options: WSClientOptions) {
    this.url = options.url;
    this.onMessageCallback = options.onMessage;
    this.onOpenCallback = options.onOpen;
    this.onCloseCallback = options.onClose;
    this.onErrorCallback = options.onError;
    
    if (options.maxReconnectDelay) {
      this.maxReconnectDelay = options.maxReconnectDelay;
    }
    if (options.reconnectDecay) {
      this.reconnectDecay = options.reconnectDecay;
    }
  }

  /**
   * 连接到 WebSocket 服务器
   */
  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    try {
      console.log(`[WS] Connecting to ${this.url}...`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] ✅ Connected');
        this.reconnectAttempts = 0; // 重置重连计数
        if (this.onOpenCallback) {
          this.onOpenCallback();
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('[WS] ⚠️ Error:', error);
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log(`[WS] ❌ Closed (code: ${event.code})`);
        this.ws = null;
        
        if (this.onCloseCallback) {
          this.onCloseCallback();
        }

        // 如果应该重连，则启动重连逻辑
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * 计划下次重连（指数退避）
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // 计算重连延迟：baseDelay * (decay ^ attempts)
    const baseDelay = 500; // 初始延迟 500ms
    const delay = Math.min(
      baseDelay * Math.pow(this.reconnectDecay, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;
    console.log(`[WS] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 发送消息
   */
  public send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Cannot send message: not connected');
    }
  }

  /**
   * 关闭连接（不再重连）
   */
  public close(): void {
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    console.log('[WS] 🛑 Connection closed by user');
  }

  /**
   * 获取当前连接状态
   */
  public getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * 是否已连接
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}









