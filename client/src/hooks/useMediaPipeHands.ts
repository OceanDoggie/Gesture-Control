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
  onResults?: (results: any) => void;
  enabled?: boolean;
}

// MediaPipe Tasks Vision CDN 配置
const MP_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm';
const HAND_TASK_CDN = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export function useMediaPipeHands({ onResults, enabled = true }: MediaPipeHandsConfig) {
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

  /**
   * 处理视频帧（兼容原 API）
   * @param videoElement HTML Video 元素
   */
  const processFrame = async (videoElement: HTMLVideoElement) => {
    if (!handLandmarkerRef.current || !isReady) {
      return;
    }

    try {
      // 获取当前视频时间戳（毫秒）
      const timestamp = Date.now();

      // 调用 HandLandmarker 检测
      const results = handLandmarkerRef.current.detectForVideo(videoElement, timestamp);

      // 转换结果格式以兼容原有回调（模拟 @mediapipe/hands 的格式）
      if (onResultsRef.current) {
        onResultsRef.current({
          image: videoElement,
          multiHandLandmarks: results.landmarks,      // 21 个关键点
          multiHandWorldLandmarks: results.worldLandmarks,
          multiHandedness: results.handedness,        // 左/右手
        });
      }
    } catch (err) {
      console.error('[MP] Frame processing error:', err);
    }
  };

  return {
    isReady,
    error,
    processFrame,
    handLandmarker: handLandmarkerRef.current,
  };
}

