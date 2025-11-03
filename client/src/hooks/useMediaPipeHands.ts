/**
 * MediaPipe Hands Hook - 使用 HandLandmarker CDN 方案
 * 
 * 改用 @mediapipe/tasks-vision 的 HandLandmarker，
 * 通过官方 CDN 加载 wasm 和模型文件，避免 Render 静态资源 404
 * 
 * 关键改动：
 * - 从 @mediapipe/hands 迁移到 @mediapipe/tasks-vision
 * - wasm 和模型文件全部走 CDN（无需本地打包）
 * - 保持与原有 API 兼容
 */

import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface MediaPipeHandsConfig {
  video: HTMLVideoElement | null;      // 视频元素
  enabled?: boolean;                    // 是否启用检测
  onResults?: (landmarks: any) => void; // 结果回调
}

// MediaPipe Tasks Vision CDN 配置
const MP_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm';
const HAND_TASK_CDN = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export default function useMediaPipeHands({ video, enabled = true, onResults }: MediaPipeHandsConfig) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const onResultsRef = useRef(onResults);

  // 更新回调引用（避免因回调变化导致重复初始化）
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    // 异步初始化 HandLandmarker
    const initHandLandmarker = async () => {
      try {
        console.log('[MP] Initializing MediaPipe HandLandmarker from CDN...');
        console.log('[MP] WASM CDN:', MP_WASM_CDN);
        console.log('[MP] Model CDN:', HAND_TASK_CDN);

        // 1. 初始化 FilesetResolver（加载 wasm 运行时）
        const vision = await FilesetResolver.forVisionTasks(MP_WASM_CDN);

        // 2. 创建 HandLandmarker 实例
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_TASK_CDN },
          runningMode: 'VIDEO',     // 视频流模式
          numHands: 1,              // 只检测一只手
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (!isMounted) {
          handLandmarker.close();
          return;
        }

        handLandmarkerRef.current = handLandmarker;
        setIsReady(true);
        console.info('✅ MediaPipe HandLandmarker 初始化完成');

      } catch (err: any) {
        console.error('❌ MediaPipe HandLandmarker 初始化失败', err);
        if (isMounted) {
          setError(err.message || 'Failed to initialize HandLandmarker');
          setIsReady(false);
        }
      }
    };

    initHandLandmarker();

    // 清理
    return () => {
      isMounted = false;
      if (handLandmarkerRef.current) {
        try {
          handLandmarkerRef.current.close();
        } catch (e) {
          console.warn('[MP] Cleanup error:', e);
        }
        handLandmarkerRef.current = null;
      }
    };
  }, [enabled]);

  // 自动帧循环：当 video、enabled 和 isReady 都满足时启动
  useEffect(() => {
    if (!video || !enabled || !isReady || !handLandmarkerRef.current) {
      return;
    }

    let animationId: number;
    let lastTimestamp = -1;

    // 帧处理函数
    const detectFrame = () => {
      if (!video || !handLandmarkerRef.current) return;

      try {
        const now = Date.now();
        
        // 调用 HandLandmarker 检测（detectForVideo 需要单调递增的时间戳）
        const results = handLandmarkerRef.current.detectForVideo(video, now);

        // 提取 landmarks 并传给回调
        if (onResultsRef.current && results.landmarks && results.landmarks.length > 0) {
          onResultsRef.current(results.landmarks); // 传递 landmarks 数组
        }

        lastTimestamp = now;
      } catch (err) {
        console.error('[MP] Frame processing error:', err);
      }

      // 继续下一帧
      animationId = requestAnimationFrame(detectFrame);
    };

    // 启动帧循环
    detectFrame();

    // 清理
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [video, enabled, isReady]);

  return {
    ready: isReady,  // 返回 ready 状态
    error,
  };
}

