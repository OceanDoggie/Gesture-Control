/**
 * 前端配置文件
 * 统一管理 WebSocket、API 等配置
 */

/**
 * WebSocket 连接地址
 * 优先级：
 * 1. 环境变量 VITE_WS_URL（显式配置）
 * 2. 根据当前协议自动判断（https -> wss，http -> ws）
 */
export const WS_URL =
  import.meta.env.VITE_WS_URL ??
  (typeof window !== "undefined" && window.location.protocol === "https:"
    ? `wss://${window.location.host.replace(/^www\./, "")}/ws/gesture`
    : "ws://localhost:4000/ws/gesture");

// 开发环境下打印配置信息
if (import.meta.env.DEV) {
  console.log("[Config] WebSocket URL:", WS_URL);
}


