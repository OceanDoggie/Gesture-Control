// WebcamViewer.tsx
// CHANGE SUMMARY:
// - All UI text switched to English.
// - Gesture buttons only SELECT the target (do NOT auto-start).
// - Added "Start Recognition" (Play) and "Stop" (Square) buttons.
// - Smarter button disable states & helpful error messages in English.
// - Kept your scoring/feedback UI and frame loop logic unchanged.

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  AlertCircle,
  Info,
  Brain,
  Target,
  CheckCircle,
  Play,
  Square,
} from 'lucide-react'; // CHANGE: added Play/Square icons
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '../hooks/useI18n'; // i18n 支持
import { useGestureScore } from '../hooks/useGestureScore'; // 评分系统 Hook
import { useSpellingCoach } from '../hooks/useSpellingCoach'; // 拼写指导 Hook
import { LETTERS } from '../constants/letters'; // 字母常量
import { WebcamOverlay } from './WebcamOverlay'; // Overlay 组件
import { DebugPanel } from './DebugPanel'; // Debug 面板组件
import { drawLandmarks, clearCanvas } from '../utils/drawHelpers'; // 绘制工具
import { Input } from './ui/input'; // Input 组件
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select'; // Select 组件
import { WS_URL } from '../config'; // WebSocket 统一配置
import useMediaPipeHands from '@/hooks/useMediaPipeHands'; // MediaPipe Hands Hook

interface GestureResult {
  gesture: string;
  confidence: number;
  confidence_percent?: number;
  grade?: string;
  grade_description?: string;
  message: string;
  hand_id?: number;
}

interface GestureInstruction {
  gesture: string;
  instruction: string;
  practice_tip: string;
  difficulty: string;
}

export default function WebcamViewer() {
  // 获取国际化文案
  const lang = useI18n();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // 用于捕获帧
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // 用于绘制 landmarks
  const wsRef = useRef<WebSocket | null>(null);
  
  // ⚠️ 性能优化：仅保存最新消息，旧消息会被覆盖（避免延迟累积）
  const latestMsgRef = useRef<any>(null);
  
  // FPS 统计（用于性能监控）
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now(), fps: 0 });
  const wsCounterRef = useRef({ frames: 0, lastTime: Date.now(), fps: 0 });

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // MediaPipe 启用状态（摄像头打开后启用）
  const [mpEnabled, setMpEnabled] = useState(false);
  
  // 任务 A：手势存在状态（基于 MediaPipe landmarks）
  const [hasHand, setHasHand] = useState(false);
  const noHandCounter = useRef(0); // 防抖计数器
  const lastLandmarks = useRef<any>(null); // 保存最近一次 landmarks 用于绘制

  // 接入 MediaPipe Hands Hook
  const { ready: mpReady } = useMediaPipeHands({
    video: videoRef.current,
    enabled: mpEnabled,
    onResults: (lms) => {
      // 任务 A：判断是否有手（landmarks 数组非空且至少 21 个点）
      const present = Array.isArray(lms) && lms.length > 0 && lms[0]?.length >= 21;
      
      if (present) {
        // 检测到手，立即重置防抖计数器
        noHandCounter.current = 0;
        lastLandmarks.current = lms; // 保存 landmarks
        
        // 任务 C：首次检测到手时打印日志
        if (!hasHand) {
          console.info('[UI] hand detected');
          setHasHand(true);
        }
      } else {
        // 没检测到手，累计防抖计数
        // 连续 8 帧都没手才置 false，避免闪烁
        if (++noHandCounter.current > 8 && hasHand) {
          console.info('[UI] no hand (debounced)');
          setHasHand(false);
          lastLandmarks.current = null;
        }
      }
      
      // 保留原有的 WS/评分逻辑（如果之前有的话）
      // 目前保持原有的帧发送逻辑不变
    },
  });

  // WebSocket connection status
  const [wsConnected, setWsConnected] = useState(false);

  // AI recognition state
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [gestureResults, setGestureResults] = useState<GestureResult[]>([]);
  const [targetGesture, setTargetGesture] = useState<string>(''); // CHANGE: selection only
  const [gestureInstructions, setGestureInstructions] = useState<GestureInstruction | null>(null);
  const [recognitionStats, setRecognitionStats] = useState({
    totalFrames: 0,
    successfulDetections: 0,
    accuracy: 0,
  });

  // 评分系统 Hook（包含性能指标）
  const {
    score,
    smoothScore,  // EMA 平滑后的分数（用于进度条）
    accuracy,
    total,
    hits,
    landmarks,
    predicted,
    landmarksOk,
    handsDetected,
    latencyMs,    // 网络延迟
    inferenceMs,  // 推理耗时
    onMessage: onScoreMessage,
    reset: resetScore,
  } = useGestureScore();
  
  // Debug 显示开关（可通过键盘 D 切换）
  const [showDebug, setShowDebug] = useState(false);
  
  // 视频镜像开关（默认开启，模拟镜子效果）
  const [videoMirrored, setVideoMirrored] = useState(true);
  
  // 拼写指导 Hook
  const spellingCoach = useSpellingCoach({ scoreThreshold: 75, stableFrames: 10 });
  
  // 键盘快捷键：D 切换 Debug 显示
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowDebug((prev) => {
          console.log(`[Debug] ${!prev ? 'Enabled' : 'Disabled'}`);
          return !prev;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 🔌 自动连接 WebSocket（组件挂载时立即连接，卸载时关闭）
  useEffect(() => {
    // 使用统一的 WebSocket 配置（从 config.ts 导入）
    console.log('[WS] Connecting to:', WS_URL);

    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log('[WS] ✅ Connected to backend');
      setWsConnected(true);
      setError(null);
    };

    socket.onerror = (e) => {
      console.log('[WS] ⚠️ Error', e);
      setWsConnected(false);
      setError(lang.error.wsConnectionFailed);
    };

    socket.onclose = (e) => {
      console.log('[WS] ❌ Closed', e.code, e.reason || '(none)', 'clean=', e.wasClean);
      setWsConnected(false);
      
      if (e.code === 1006) {
        setError(lang.error.wsClosedUnexpectedly);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    // 保存到 ref，供后续发送消息使用
    wsRef.current = socket;

    // 🧹 组件卸载时干净关闭，避免重复连接
    return () => {
      console.log('[WS] Cleaning up connection...');
      socket.close();
    };
  }, []); // 👈 确保只创建一次

  // ⚠️ 性能优化：WebSocket onmessage 只保存数据到 latestMsgRef
  const handleWebSocketMessage = (data: any) => {
    // 统计 WS 收包 FPS
    const wsCounter = wsCounterRef.current;
    wsCounter.frames++;
    const now = Date.now();
    if (now - wsCounter.lastTime >= 1000) {
      wsCounter.fps = Math.round((wsCounter.frames * 1000) / (now - wsCounter.lastTime));
      wsCounter.frames = 0;
      wsCounter.lastTime = now;
      
      // 打印 WS FPS（用于性能监控）
      if (showDebug) {
        console.log(`[WS FPS] ${wsCounter.fps} msg/s`);
      }
    }

    // 仅保存最新消息到 ref（不立即处理，统一在 rAF 中处理）
    latestMsgRef.current = data;

    // 旧协议兼容（非核心逻辑）
    switch (data.type) {
      case 'recognition_started':
        console.log('🎯 Recognition started');
        break;
      case 'recognition_stopped':
        console.log('⏹️ Recognition stopped');
        break;
    }
  };

  // ⚠️ 性能优化：requestAnimationFrame 统一处理消息和绘制（替换旧的 useEffect）
  useEffect(() => {
    if (!isRecognizing) return;

    let animationId: number;
    const renderLoop = () => {
      // 1. 处理最新消息（如果有）
      if (latestMsgRef.current) {
        const msg = latestMsgRef.current;
        latestMsgRef.current = null; // 清空以避免重复处理
        
        // 处理消息（更新 score、landmarks 等状态）
        if (msg.ok !== undefined) {
          onScoreMessage(msg);
        }
      }

      // 2. 更新拼写指导的稳定性（每帧调用）
      if (spellingCoach.mode === 'auto' && !spellingCoach.isComplete) {
        spellingCoach.updateStability(score, predicted);
      }

      // 3. 绘制 landmarks
      const canvas = overlayCanvasRef.current;
      const video = videoRef.current;
      
      if (canvas && video) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 同步 canvas 尺寸与 video
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // 清空 canvas
          clearCanvas(ctx, canvas.width, canvas.height);

          // 如果有 landmarks 且检测到手部，绘制（支持镜像）
          if (handsDetected && landmarks.length === 21) {
            drawLandmarks(ctx, landmarks, canvas.width, canvas.height, landmarksOk, videoMirrored);
          }
        }
      }

      // 4. 统计渲染 FPS
      const fpsCounter = fpsCounterRef.current;
      fpsCounter.frames++;
      const now = Date.now();
      if (now - fpsCounter.lastTime >= 1000) {
        fpsCounter.fps = Math.round((fpsCounter.frames * 1000) / (now - fpsCounter.lastTime));
        fpsCounter.frames = 0;
        fpsCounter.lastTime = now;
        
        // 打印渲染 FPS（用于性能监控）
        if (showDebug) {
          console.log(`[Render FPS] ${fpsCounter.fps} frames/s`);
        }
      }

      // 5. 循环
      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isRecognizing, handsDetected, landmarks, landmarksOk, onScoreMessage, showDebug, score, predicted, spellingCoach]);

  // Start recognition
  const startGestureRecognition = async (gesture: string) => {
    // CHANGE: patiently wait up to 5s for ws to be ready
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('Waiting for WebSocket to connect...');
      setError(lang.error.connectingToAI);

      const startTime = Date.now();
      const maxWaitTime = 5000;
      while (
        (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) &&
        Date.now() - startTime < maxWaitTime
      ) {
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setError(lang.error.wsWaitFailed);
        return;
      }
    }

    setTargetGesture(gesture);
    setIsRecognizing(true);
    setError(null);
    
    // 重置评分统计
    resetScore();

    // Load gesture instructions (optional)
    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const response = await fetch(`${apiBase}/api/gesture/instructions/${gesture}`);
      const data = await response.json();
      if (data.success) setGestureInstructions(data.data);
    } catch (err) {
      console.error('Failed to load gesture instructions:', err);
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'start_recognition',
        target_gesture: gesture,
      }),
    );
  };

  // Stop recognition
  const stopGestureRecognition = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_recognition' }));
    }
    setIsRecognizing(false);
    // CHANGE: keep targetGesture for resume; clear results
    setGestureResults([]);
  };

  // ⚠️ 性能优化：发送帧前先缩放到 320x240（降低传输和推理成本）
  const processFrame = useCallback(() => {
    if (!isStreaming || !isRecognizing || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 缩放到 320x240（模型输入尺寸）
    const TARGET_WIDTH = 320;
    const TARGET_HEIGHT = 240;
    
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;

    // 绘制并缩放视频帧
    ctx.drawImage(video, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // 使用较低质量（0.6）减少传输数据量
    const frameData = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'frame_data',
          frame: frameData,
        }),
      );
    }
  }, [isStreaming, isRecognizing]);

  const startCamera = async () => {
    try {
      setError(null);
      
      // ⚠️ 性能优化：降低分辨率和帧率（640x480@20-24fps）
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { min: 20, ideal: 24, max: 24 }
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
        
        // 等待视频播放后启用 MediaPipe
        await videoRef.current.play();
        setMpEnabled(true);
        
        console.info('Camera started'); // 验收标准日志
        console.log('Camera started successfully (640x480@20-24fps)');
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError(lang.error.cameraAccessFailed);
    }
  };

  const stopCamera = () => {
    // 停止 MediaPipe
    setMpEnabled(false);
    
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    setIsStreaming(false);
    stopGestureRecognition();
    
    console.info('Camera stopped'); // 验收标准日志
  };

  // 发送帧循环（独立于渲染循环，使用 setInterval 限制发送速率）
  useEffect(() => {
    if (!isStreaming || !isRecognizing) return;

    // 限制发送帧率为 ~20fps（每 50ms 一帧）
    const interval = setInterval(() => {
      processFrame();
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [isStreaming, isRecognizing, processFrame]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return (
    <div className="space-y-6">
      {/* Camera Container */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {/* 标题 - 使用 i18n */}
            <h2 className="text-2xl font-semibold text-foreground">{lang.ui.title}</h2>
            <div className="flex gap-2 items-center">
              {/* MediaPipe 状态显示 */}
              {isStreaming && (
                <Badge variant="outline" className="text-xs">
                  {mpReady ? 'MP ready ✅' : 'MP init…'}
                </Badge>
              )}
              <Button
                onClick={startCamera}
                disabled={isStreaming}
                variant={isStreaming ? 'secondary' : 'default'}
                className="flex items-center gap-2"
                data-testid="button-start-camera"
              >
                <Camera className="h-4 w-4" />
                {lang.ui.startCamera}
              </Button>
              <Button
                onClick={stopCamera}
                disabled={!isStreaming}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-stop-camera"
              >
                <CameraOff className="h-4 w-4" />
                {lang.ui.stopCamera}
              </Button>
            </div>
          </div>

          {/* Controls - 拼写指导 UI */}
          {isStreaming && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-accent/10 rounded-lg">
              <div className="space-y-3">
                {/* 标题 */}
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  {lang.ui.spellingCoach}
                </h3>

                {/* 模式切换 */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={spellingCoach.mode === 'free' ? 'default' : 'outline'}
                    onClick={() => {
                      spellingCoach.setMode('free');
                      setTargetGesture(spellingCoach.currentLetter);
                    }}
                    disabled={isRecognizing}
                    className="flex-1"
                  >
                    {lang.ui.freeMode}
                  </Button>
                  <Button
                    size="sm"
                    variant={spellingCoach.mode === 'auto' ? 'default' : 'outline'}
                    onClick={() => {
                      if (!spellingCoach.word) {
                        setError(lang.error.enterWordFirst);
                        return;
                      }
                      spellingCoach.setMode('auto');
                      setTargetGesture(spellingCoach.currentLetter);
                    }}
                    disabled={isRecognizing}
                    className="flex-1"
                  >
                    {lang.ui.autoMode}
                  </Button>
                </div>

                {/* 字母选择（下拉框） - Free 模式 */}
                {spellingCoach.mode === 'free' && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{lang.ui.selectLetter}</label>
                    <Select
                      value={spellingCoach.currentLetter}
                      onValueChange={(value) => {
                        spellingCoach.setCurrentLetter(value);
                        setTargetGesture(value);
                      }}
                      disabled={isRecognizing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LETTERS.map((letter) => (
                          <SelectItem key={letter} value={letter}>
                            {letter}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 单词输入 - Auto 模式 */}
                {spellingCoach.mode === 'auto' && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{lang.ui.enterWord}</label>
                    <Input
                      placeholder={lang.ui.wordPlaceholder}
                      value={spellingCoach.word}
                      onChange={(e) => {
                        const word = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                        spellingCoach.setWord(word);
                      }}
                      disabled={isRecognizing}
                      className="uppercase"
                    />
                  </div>
                )}

                {/* 开始/停止控制 */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (spellingCoach.mode === 'auto' && !spellingCoach.word) {
                        setError(lang.error.enterWordFirst);
                        return;
                      }
                      startGestureRecognition(spellingCoach.currentLetter);
                    }}
                    disabled={!wsConnected || !isStreaming || isRecognizing}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Play className="h-4 w-4" />
                    {lang.ui.startRecognition}
                  </Button>

                  <Button
                    onClick={stopGestureRecognition}
                    disabled={!isRecognizing}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-4 w-4" />
                    {lang.ui.stopRecognition}
                  </Button>
                </div>

                {/* Auto 模式：当前字母和进度显示 */}
                {spellingCoach.mode === 'auto' && isRecognizing && (
                  <div className="space-y-2 p-2 bg-background/50 rounded border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{lang.ui.currentLetter}:</span>
                      <span className="font-bold text-lg text-primary">{spellingCoach.currentLetter}</span>
                    </div>
                    {spellingCoach.nextLetter && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{lang.ui.nextLetter}:</span>
                        <span className="font-medium text-muted-foreground">{spellingCoach.nextLetter}</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{lang.ui.stability}</span>
                        <span>{spellingCoach.progress}%</span>
                      </div>
                      <Progress value={spellingCoach.progress} className="h-2" />
                    </div>
                    {spellingCoach.isComplete && (
                      <div className="text-sm font-medium text-green-600 text-center">
                        {lang.ui.wordComplete}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {/* 状态 */}
                <h3 className="font-medium text-sm">{lang.status.title}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {wsConnected ? (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 bg-green-50 text-green-700 border-green-300"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {lang.status.wsConnected}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-300"
                    >
                      <AlertCircle className="h-3 w-3" />
                      {lang.status.connecting}
                    </Badge>
                  )}

                  {isRecognizing ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      {lang.status.recognizing}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{lang.status.idle}</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {/* 识别统计 */}
                <h3 className="font-medium text-sm">{lang.stats.title}</h3>
                <div className="text-xs text-muted-foreground">
                  <div>{lang.stats.totalFrames}: {total}</div>
                  <div>{lang.stats.correctFrames}: {hits}</div>
                  <div>{lang.stats.accuracy}: {accuracy}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Video */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: videoMirrored ? 'scaleX(-1)' : 'none' }}
              data-testid="video-webcam-feed"
            />

            {/* Landmarks overlay canvas（叠加在 video 上绘制关键点） */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Hidden canvas（用于捕获帧） */}
            <canvas ref={canvasRef} className="hidden" />

            {/* 评分 Overlay（仅在识别时显示） */}
            {isRecognizing && (
              <WebcamOverlay
                score={score}              // Live Score 显示即时分数
                smoothScore={smoothScore}  // 进度条使用平滑分数
                handsDetected={hasHand}    // 任务 A：使用 MediaPipe 的手势存在状态
                predicted={predicted}
                landmarksOk={landmarksOk}
                showDebug={showDebug}
                fps={fpsCounterRef.current.fps}
                landmarks={lastLandmarks.current}  // 任务 B：传入 landmarks 用于绘制
                videoMirrored={videoMirrored}      // 传入镜像状态
              />
            )}

            {/* Debug 面板（按 D 键切换） */}
            <DebugPanel
              latencyMs={latencyMs}
              inferenceMs={inferenceMs}
              wsRecvFps={wsCounterRef.current.fps}
              renderFps={fpsCounterRef.current.fps}
              scoreNow={score}
              landmarksOk={landmarksOk}
              show={showDebug}
            />

            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  {/* 相机预览占位符 */}
                  <p className="text-lg font-medium text-foreground">{lang.ui.cameraPreview}</p>
                  <p className="text-sm text-muted-foreground">{lang.ui.clickToStart}</p>
                </div>
              </div>
            )}

            {/* Live 徽章 */}
            {isStreaming && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-600/90 text-white px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {lang.ui.live}
              </div>
            )}

            {/* Results */}
            {isRecognizing && gestureResults.length > 0 && (
              <div className="absolute top-4 right-4 space-y-2">
                {gestureResults.map((result, i) => {
                  const gradeColor =
                    result.grade === 'A'
                      ? 'bg-green-600'
                      : result.grade === 'B'
                      ? 'bg-blue-600'
                      : result.grade === 'C'
                      ? 'bg-yellow-600'
                      : 'bg-red-600';

                  return (
                    <div
                      key={i}
                      className="bg-black/90 text-white px-4 py-3 rounded-lg text-sm min-w-[200px]"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          <span className="font-bold text-lg">{result.gesture}</span>
                        </div>
                        {result.grade && (
                          <div className={`${gradeColor} px-3 py-1 rounded-full font-bold text-white`}>
                            {result.grade}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>{lang.stats.confidence}:</span>
                          <span className="font-medium">
                            {result.confidence_percent || Math.round(result.confidence * 100)}%
                          </span>
                        </div>

                        {result.grade_description && (
                          <div className="text-xs text-gray-300">{lang.stats.feedback}: {result.grade_description}</div>
                        )}

                        <Progress
                          value={result.confidence_percent || result.confidence * 100}
                          className="h-2 mt-2"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 目标指示器 */}
            {isRecognizing && targetGesture && (
              <div className="absolute bottom-4 left-4 bg-blue-600/90 text-white px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>{lang.ui.target(targetGesture)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Errors */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 手势练习提示卡片 */}
      {gestureInstructions && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-900">
                {lang.tips.title(gestureInstructions.gesture)}
              </h3>
              <p className="text-sm text-blue-700">{gestureInstructions.instruction}</p>
              <p className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                💡 {gestureInstructions.practice_tip}
              </p>
              <Badge variant="outline" className="text-xs">
                {lang.tips.difficultyLabel(gestureInstructions.difficulty)}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* 系统状态面板 */}
      <Card className="p-6 bg-accent/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">{lang.status.systemTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {isStreaming
                ? isRecognizing
                  ? lang.status.recognizingGesture(targetGesture)
                  : lang.status.cameraOnSelectGesture
                : lang.status.turnOnCamera}
            </p>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>• {lang.status.wsStatus}: {wsConnected ? `✅ ${lang.status.wsConnected}` : `🔄 ${lang.status.connecting}`}</p>
              <p>• {lang.status.handTracking}: {isStreaming ? `✅ ${lang.status.active}` : `⏸️ ${lang.status.idle}`}</p>
              <p>• {lang.status.aiStatus}: {isRecognizing ? `🧠 ${lang.status.running}` : `⏸️ ${lang.status.idle}`}</p>
              <p>• {lang.status.liveFeedback}: {isRecognizing ? `📊 ${lang.status.visible}` : `⏸️ ${lang.status.hidden}`}</p>
              {recognitionStats.totalFrames > 0 && (
                <p>• {lang.status.accuracy}: {recognitionStats.accuracy.toFixed(1)}%</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
