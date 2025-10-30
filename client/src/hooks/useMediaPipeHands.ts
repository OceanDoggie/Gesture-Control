/**
 * MediaPipe Hands Hook - 使用 CDN 加载资源
 * 
 * 这个 hook 提供了前端直接使用 MediaPipe 的能力，
 * 使用 CDN 加载 wasm 和模型文件，避免 Render 静态资源 404
 * 
 * 支持环境变量切换：
 * - VITE_USE_FRONTEND_MP=true: 前端直接处理（推荐生产环境）
 * - VITE_USE_FRONTEND_MP=false: 使用后端 WebSocket（默认）
 */

import { useEffect, useRef, useState } from 'react';
import { Hands } from '@mediapipe/hands';

interface MediaPipeHandsConfig {
  onResults?: (results: any) => void;
  enabled?: boolean;
}

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4';

export function useMediaPipeHands({ onResults, enabled = true }: MediaPipeHandsConfig) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handsRef = useRef<Hands | null>(null);

  useEffect(() => {
    if (!enabled) return;

    console.log('[MP] Initializing MediaPipe Hands with CDN...');

    try {
      // ✅ 使用 CDN 路径加载 wasm 和模型文件
      const hands = new Hands({
        locateFile: (file: string) => {
          const cdnUrl = `${CDN_BASE}/${file}`;
          console.log(`[MP] Loading from CDN: ${cdnUrl}`);
          return cdnUrl;
        },
      });

      // 配置手势识别参数
      hands.setOptions({
        modelComplexity: 1,
        selfieMode: true, // 镜像模式，适合前置摄像头
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        maxNumHands: 1, // 只检测一只手，提高性能
      });

      // 设置结果回调
      if (onResults) {
        hands.onResults(onResults);
      }

      handsRef.current = hands;
      setIsReady(true);
      console.log('[MP] ✅ MediaPipe Hands initialized successfully');
      console.log('[MP] Backend: @mediapipe/hands (CDN mode)');

    } catch (err: any) {
      console.error('[MP] ❌ Failed to initialize:', err);
      setError(err.message || 'Failed to initialize MediaPipe');
      setIsReady(false);
    }

    // 清理
    return () => {
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {
          console.warn('[MP] Cleanup error:', e);
        }
        handsRef.current = null;
      }
    };
  }, [enabled, onResults]);

  /**
   * 处理视频帧
   * @param videoElement HTML Video 元素
   */
  const processFrame = async (videoElement: HTMLVideoElement) => {
    if (!handsRef.current || !isReady) {
      return;
    }

    try {
      await handsRef.current.send({ image: videoElement });
    } catch (err) {
      console.error('[MP] Frame processing error:', err);
    }
  };

  return {
    isReady,
    error,
    processFrame,
    hands: handsRef.current,
  };
}

