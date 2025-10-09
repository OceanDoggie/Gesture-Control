import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, AlertCircle, Info, Brain, Target, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // WebSocket连接状态
  const [wsConnected, setWsConnected] = useState(false);
  
  // AI手势识别状态
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [gestureResults, setGestureResults] = useState<GestureResult[]>([]);
  const [targetGesture, setTargetGesture] = useState<string>('');
  const [gestureInstructions, setGestureInstructions] = useState<GestureInstruction | null>(null);
  const [recognitionStats, setRecognitionStats] = useState({
    totalFrames: 0,
    successfulDetections: 0,
    accuracy: 0
  });

  // 初始化WebSocket连接
  const initializeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // 自动使用当前页面的host和端口，无需手动配置
    const host = window.location.host || 'localhost:4000';
    const wsUrl = `${protocol}//${host}/ws/gesture`;

    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('🔗 WebSocket连接已建立');
      setWsConnected(true); // 更新连接状态
      setError(null); // 清除错误
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('🔌 WebSocket连接已关闭');
      setWsConnected(false); // 更新连接状态
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket错误:', error);
      setWsConnected(false); // 更新连接状态
      setError('WebSocket连接失败，请确保后端服务已启动');
    };
  }, []);

  // 处理WebSocket消息
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'gesture_result':
        setGestureResults(data.gestures || []);
        if (data.gestures && data.gestures.length > 0) {
          setRecognitionStats(prev => ({
            ...prev,
            totalFrames: prev.totalFrames + 1,
            successfulDetections: prev.successfulDetections + 1,
            accuracy: ((prev.successfulDetections + 1) / (prev.totalFrames + 1)) * 100
          }));
        }
        break;
      case 'recognition_started':
        console.log('🎯 手势识别已开始');
        break;
      case 'recognition_stopped':
        console.log('⏹️ 手势识别已停止');
        break;
      default:
        console.log('收到消息:', data);
    }
  };

  // 开始手势识别
  const startGestureRecognition = async (gesture: string) => {
    // 如果WebSocket还未连接，等待最多5秒
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('等待WebSocket连接...');
      setError('正在连接AI识别服务，请稍候...');
      
      // 等待WebSocket连接，最多5秒
      const startTime = Date.now();
      const maxWaitTime = 5000; // 5秒
      
      while ((!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) && 
             (Date.now() - startTime < maxWaitTime)) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms后重试
      }
      
      // 如果还是没连接上，显示错误
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setError('WebSocket连接失败，请确保后端服务已启动');
        return;
      }
    }

    setTargetGesture(gesture);
    setIsRecognizing(true);
    setError(null); // 清除错误信息
    
    // 获取手势指导
    try {
      const response = await fetch(`/api/gesture/instructions/${gesture}`);
      const data = await response.json();
      if (data.success) {
        setGestureInstructions(data.data);
      }
    } catch (error) {
      console.error('获取手势指导失败:', error);
    }

    // 发送开始识别消息
    wsRef.current.send(JSON.stringify({
      type: 'start_recognition',
      target_gesture: gesture
    }));
  };

  // 停止手势识别
  const stopGestureRecognition = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_recognition'
      }));
    }
    setIsRecognizing(false);
    setTargetGesture('');
    setGestureResults([]);
  };

  // 处理视频帧
  const processFrame = useCallback(() => {
    if (!isStreaming || !isRecognizing || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // 设置canvas尺寸
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 绘制当前帧
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 转换为base64
    const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    // 发送到WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'frame_data',
        frame: frameData
      }));
    }
  }, [isStreaming, isRecognizing]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
        console.log('Camera started successfully');
        
        // 初始化WebSocket连接
        initializeWebSocket();
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    stopGestureRecognition();
    console.log('Camera stopped');
  };

  // 帧处理循环
  useEffect(() => {
    let animationId: number;
    
    if (isStreaming && isRecognizing) {
      const processLoop = () => {
        processFrame();
        animationId = requestAnimationFrame(processLoop);
      };
      processLoop();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isStreaming, isRecognizing, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stream]);

  return (
    <div className="space-y-6">
      {/* Camera Container */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">AI手势识别相机</h2>
            <div className="flex gap-2">
              <Button
                onClick={startCamera}
                disabled={isStreaming}
                variant={isStreaming ? "secondary" : "default"}
                className="flex items-center gap-2"
                data-testid="button-start-camera"
              >
                <Camera className="h-4 w-4" />
                启动相机
              </Button>
              <Button
                onClick={stopCamera}
                disabled={!isStreaming}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-stop-camera"
              >
                <CameraOff className="h-4 w-4" />
                停止
              </Button>
            </div>
          </div>

          {/* AI手势识别控制面板 */}
          {isStreaming && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-accent/10 rounded-lg">
              <div className="space-y-2">
                <h3 className="font-medium text-sm">选择练习手势</h3>
                <div className="flex flex-wrap gap-1">
                  {['A', 'B', 'C', 'D', 'E'].map((gesture) => (
                    <Button
                      key={gesture}
                      size="sm"
                      variant={targetGesture === gesture ? "default" : "outline"}
                      onClick={() => startGestureRecognition(gesture)}
                      disabled={isRecognizing && targetGesture !== gesture}
                    >
                      {gesture}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-sm">识别状态</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* WebSocket连接状态 */}
                  {wsConnected ? (
                    <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-300">
                      <CheckCircle className="h-3 w-3" />
                      已连接
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-300">
                      <AlertCircle className="h-3 w-3" />
                      连接中...
                    </Badge>
                  )}
                  
                  {/* AI识别状态 */}
                  {isRecognizing ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      AI识别中
                    </Badge>
                  ) : (
                    <Badge variant="secondary">待机中</Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-sm">识别统计</h3>
                <div className="text-xs text-muted-foreground">
                  <div>总帧数: {recognitionStats.totalFrames}</div>
                  <div>成功率: {recognitionStats.accuracy.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Video Feed */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-webcam-feed"
            />
            
            {/* 隐藏的canvas用于帧处理 */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">相机预览</p>
                  <p className="text-sm text-muted-foreground">点击"启动相机"开始</p>
                </div>
              </div>
            )}

            {/* 状态指示器 */}
            {isStreaming && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-600/90 text-white px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                实时
              </div>
            )}

            {/* AI识别结果显示（带打分系统） */}
            {isRecognizing && gestureResults.length > 0 && (
              <div className="absolute top-4 right-4 space-y-2">
                {gestureResults.map((result, index) => {
                  // 根据评分等级设置颜色
                  const gradeColor = 
                    result.grade === 'A' ? 'bg-green-600' :
                    result.grade === 'B' ? 'bg-blue-600' :
                    result.grade === 'C' ? 'bg-yellow-600' :
                    'bg-red-600';
                  
                  return (
                    <div
                      key={index}
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
                          <span>置信度:</span>
                          <span className="font-medium">
                            {result.confidence_percent || Math.round(result.confidence * 100)}%
                          </span>
                        </div>
                        
                        {result.grade_description && (
                          <div className="text-xs text-gray-300">
                            评价: {result.grade_description}
                          </div>
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

            {/* 目标手势指示 */}
            {isRecognizing && targetGesture && (
              <div className="absolute bottom-4 left-4 bg-blue-600/90 text-white px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>练习手势: {targetGesture}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI手势指导面板 */}
      {gestureInstructions && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-900">手势指导 - {gestureInstructions.gesture}</h3>
              <p className="text-sm text-blue-700">{gestureInstructions.instruction}</p>
              <p className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                💡 {gestureInstructions.practice_tip}
              </p>
              <Badge variant="outline" className="text-xs">
                难度: {gestureInstructions.difficulty}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* 识别状态面板 */}
      <Card className="p-6 bg-accent/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">AI识别状态</h3>
            <p className="text-sm text-muted-foreground">
              {isStreaming 
                ? (isRecognizing 
                    ? `正在识别手势 ${targetGesture}，请按照指导做出正确的手势` 
                    : "相机已启动，请选择要练习的手势开始AI识别")
                : "启动相机以启用AI手势识别功能"}
            </p>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>• WebSocket连接: {wsConnected ? '✅ 已连接' : '🔄 连接中...'}</p>
              <p>• 手部追踪: {isStreaming ? '✅ 已激活' : '⏸️ 待机中'}</p>
              <p>• AI识别: {isRecognizing ? '🧠 运行中' : '⏸️ 待机中'}</p>
              <p>• 实时反馈: {isRecognizing ? '📊 显示中' : '⏸️ 待机中'}</p>
              {recognitionStats.totalFrames > 0 && (
                <p>• 识别准确率: {recognitionStats.accuracy.toFixed(1)}%</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}