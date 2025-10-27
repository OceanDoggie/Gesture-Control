/**
 * WebSocket 服务：前端 <-> Node <-> Python 的实时桥接（仅初始化一次）
 * 中文注释说明：
 * - 只“附着”到外部的 HTTP server（由 index.ts 创建并 listen）
 * - 不再创建第二个独立端口，避免重复 handleUpgrade / EADDRINUSE
 * - 保留心跳、日志、PythonShell 通信，并避免 TS 的 downlevelIteration 报错
 */
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { PythonShell } from "python-shell";
const WS_PATH = "/ws/gesture"; // 前端用的 WS 路径
const HEARTBEAT_MS = 30000; // 心跳间隔
export class GestureWebSocketService {
    /**
     * 只附着到外部 server（由 index.ts 传入）
     */
    constructor(externalServer) {
        this.clients = new Map();
        this.pythonProcess = null;
        this.heartBeatTimer = null;
        this.httpServer = externalServer;
        console.log("🔗 Attaching Gesture WebSocket to existing HTTP server...");
        // 打印当前 upgrade 监听数量，便于调试
        const beforeCount = this.httpServer.listenerCount("upgrade");
        console.log(`🔍 WS upgrade listeners count (before): ${beforeCount}`);
        // 只初始化一次 WebSocketServer —— 使用"附着到同一个 HTTP server"的方式
        this.wss = new WebSocketServer({
            server: this.httpServer,
            path: WS_PATH, // /ws/gesture
        });
        // 确认 WebSocket 成功挂载
        const afterCount = this.httpServer.listenerCount("upgrade");
        console.log(`🔍 WS upgrade listeners count (after): ${afterCount}`);
        // ✅ 说明：开发环境下通常有 2 个监听器（Vite HMR + Gesture WS）
        if (afterCount === 2) {
            console.log(`✅ 正常：Vite HMR (/__vite_hmr) + Gesture WS (/ws/gesture) 共存`);
        }
        else if (afterCount > 2) {
            console.warn(`⚠️  警告：检测到 ${afterCount} 个 upgrade 监听器，可能存在重复初始化！`);
        }
        this.setupWebSocketHandlers();
        this.setupPythonProcess();
        this.startHeartbeat();
    }
    // ====================== WS 处理 ======================
    setupWebSocketHandlers() {
        this.wss.on("connection", (ws, req) => {
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
            ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    this.handleClientMessage(clientId, msg);
                }
                catch (err) {
                    console.error(`❌ WS message parse error:`, err);
                    this.safeSend(ws, { type: "error", message: "Invalid JSON message" });
                }
            });
            ws.on("pong", () => {
                const c = this.clients.get(clientId);
                if (c)
                    c.lastPongTs = Date.now();
            });
            ws.on("close", (_code) => {
                console.log(`🔌 WS client closed: ${clientId}`);
                this.clients.delete(clientId);
            });
            ws.on("error", (e) => {
                console.error(`❌ WS error (${clientId}):`, e);
                this.clients.delete(clientId);
            });
        });
        this.wss.on("error", (e) => {
            console.error("\n❌ WebSocketServer error:", e);
            if (e.code === 'EADDRINUSE') {
                console.error("⚠️  端口冲突：WebSocket 尝试监听已占用的端口！");
                console.error("💡 提示：请检查是否有多个 WebSocketServer 实例被创建");
            }
        });
    }
    // ====================== Python 子进程 ======================
    setupPythonProcess() {
        try {
            const scriptPath = path.join(process.cwd(), "server", "ml", "realtime_recognition.py");
            console.log(`🐍 Starting Python: ${scriptPath}`);
            this.pythonProcess = new PythonShell(scriptPath, {
                mode: "text",
                pythonPath: "python", // Windows 环境通常就是 python
                args: [],
            });
            // Python 按行输出
            this.pythonProcess.on("message", (line) => {
                try {
                    const obj = JSON.parse(line);
                    if (obj.type === "status" || obj.type === "ready") {
                        console.log(`🐍 ${obj.message || "Python ready"}`);
                    }
                    else {
                        console.log(`🐍 Python result:`, obj);
                    }
                    this.broadcastGestureResult(obj);
                }
                catch {
                    // 过滤冗余日志
                    if (!line.includes("WARNING") &&
                        !line.startsWith("INFO:") &&
                        !line.includes("W0000")) {
                        console.warn(`🐍 [raw] ${line}`);
                    }
                }
            });
            this.pythonProcess.on("stderr", (stderr) => {
                if (!stderr.includes("WARNING") && !stderr.includes("W0000")) {
                    console.error(`🐍 stderr: ${stderr}`);
                }
            });
            this.pythonProcess.on("close", (code) => {
                console.log(`🐍 Python exited with code: ${code}`);
                this.pythonProcess = null;
            });
            this.pythonProcess.on("error", (err) => {
                console.error(`❌ Python error: ${err.message}`);
                this.pythonProcess = null;
            });
            console.log("✅ Python gesture service started");
        }
        catch (error) {
            console.error(`❌ Failed to start Python:`, error);
            console.error(`👉 Make sure dependencies are installed: pip install mediapipe opencv-python numpy joblib scikit-learn`);
        }
    }
    // ====================== 业务逻辑 ======================
    handleClientMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
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
    processFrame(clientId, frameData, target) {
        const client = this.clients.get(clientId);
        if (!client || !this.pythonProcess)
            return;
        // ⚠️ 性能优化：仅保存最新帧，不排队处理旧帧（避免延迟累积）
        client.latestFrame = frameData;
        client.targetGesture = target;
        // 立即处理最新帧（如果 Python 空闲）
        this.processLatestFrame(clientId);
    }
    processLatestFrame(clientId) {
        const client = this.clients.get(clientId);
        if (!client || !client.latestFrame || !this.pythonProcess)
            return;
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
        }
        catch (e) {
            console.error("❌ send to Python failed:", e);
            this.sendToClient(clientId, { type: "error", message: "Send to Python failed" });
        }
    }
    broadcastGestureResult(result) {
        // 用 forEach，避免 TS 的 downlevelIteration 报错
        this.clients.forEach((client, clientId) => {
            if (client.isRecognizing && client.ws.readyState === WebSocket.OPEN) {
                this.safeSend(client.ws, { type: "gesture_result", ...result });
            }
        });
    }
    sendToClient(clientId, message) {
        const c = this.clients.get(clientId);
        if (!c || c.ws.readyState !== WebSocket.OPEN)
            return;
        this.safeSend(c.ws, message);
    }
    safeSend(ws, data) {
        try {
            ws.send(JSON.stringify(data));
        }
        catch (e) {
            console.error("❌ WS send failed:", e);
        }
    }
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    // ====================== 心跳保活 ======================
    startHeartbeat() {
        if (this.heartBeatTimer)
            clearInterval(this.heartBeatTimer);
        this.heartBeatTimer = setInterval(() => {
            const now = Date.now();
            // 用 forEach 避免 Map 的 for...of 触发 ts(2802)
            this.clients.forEach((c, id) => {
                // 两个心跳周期没响应就断开
                if (now - c.lastPongTs > HEARTBEAT_MS * 2) {
                    try {
                        c.ws.terminate();
                    }
                    catch { }
                    this.clients.delete(id);
                    console.warn(`⚠️  Terminated stale client: ${id}`);
                    return;
                }
                try {
                    c.ws.ping();
                }
                catch { }
            });
        }, HEARTBEAT_MS);
    }
    // ====================== 关闭清理 ======================
    getConnectionStats() {
        let active = 0;
        this.clients.forEach(c => { if (c.isRecognizing)
            active++; });
        return { total_clients: this.clients.size, active_recognition: active };
    }
    close() {
        if (this.heartBeatTimer)
            clearInterval(this.heartBeatTimer);
        this.clients.forEach((c) => { try {
            c.ws.close();
        }
        catch { } });
        this.clients.clear();
        if (this.pythonProcess) {
            try {
                this.pythonProcess.kill();
            }
            catch { }
            this.pythonProcess = null;
        }
        try {
            this.wss.close();
        }
        catch { }
        console.log("🛑 WS service closed.");
    }
}
