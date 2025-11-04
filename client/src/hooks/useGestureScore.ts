/**
 * useGestureScore Hook
 * 用于管理手势识别评分和统计数据
 * 
 * 功能:
 * - 实时计算当前分数（0-100）
 * - 统计总帧数、正确帧数、累计准确率
 * - 无手帧不计入统计
 * - 提供 landmarks、predicted、landmarksOk 等详细信息
 */

import { useState, useCallback } from "react";
import type { Landmark } from "../utils/drawHelpers";

interface GestureScoreData {
  score: number;          // 当前分数 (0-100)
  total: number;          // 总帧数
  hits: number;           // 正确帧数
  accuracy: number;       // 累计准确率 (0-100)
}

interface GestureMessage {
  ok?: boolean;
  data?: {
    type?: string;
    hands_detected?: boolean;
    confidence?: number;
    target?: string;
    predicted?: string;
    landmarks_ok?: boolean;
    landmarks?: Landmark[];
    server_ts?: number;  // 服务器时间戳（毫秒）
    inference_ms?: number;  // 推理耗时（毫秒）
  };
}

export function useGestureScore() {
  const [score, setScore] = useState(0);       // 当前帧分数 0~100（实时）
  const [smoothScore, setSmoothScore] = useState(0);  // EMA 平滑后分数（用于进度条）
  const [total, setTotal] = useState(0);       // 总帧数
  const [hits, setHits] = useState(0);         // 命中帧数
  
  // 新增状态：详细信息
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [predicted, setPredicted] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);  // 预测置信度 (0-1)
  const [landmarksOk, setLandmarksOk] = useState(false);
  const [handsDetected, setHandsDetected] = useState(false);
  
  // 性能指标
  const [latencyMs, setLatencyMs] = useState(0);  // 网络延迟（客户端接收时间 - 服务器发送时间）
  const [inferenceMs, setInferenceMs] = useState(0);  // 推理耗时
  
  // EMA 平滑参数（alpha=0.7，对变化更敏感）
  const EMA_ALPHA = 0.7;

  /**
   * 处理来自 WebSocket 的消息
   * 根据新协议提取 confidence、predicted、target、landmarks 等字段
   */
  const onMessage = useCallback((msg: GestureMessage) => {
    // 检查消息格式
    if (!msg?.ok || msg.data?.type !== "gesture_result") {
      return;
    }

    const {
      hands_detected,
      confidence,
      target,
      predicted: predictedGesture,
      landmarks_ok,
      landmarks: landmarksData,
      server_ts,
      inference_ms,
    } = msg.data;
    
    // 计算延迟（客户端接收时间 - 服务器发送时间）
    if (server_ts) {
      const clientTs = Date.now();
      const latency = clientTs - server_ts;
      setLatencyMs(latency);
    }
    
    // 记录推理耗时
    if (inference_ms !== undefined) {
      setInferenceMs(inference_ms);
    }

    // 更新手部检测状态
    setHandsDetected(!!hands_detected);
    setPredicted(predictedGesture || null);
    setLandmarksOk(!!landmarks_ok);
    setLandmarks(landmarksData || []);
    
    // 计算并保存 confidence
    const rawConf = Number(confidence) || 0;
    const normalizedConf = Math.max(0, Math.min(1, rawConf)); // 限制在 0-1
    setConfidence(normalizedConf);

    // 无手帧不计入统计
    if (!hands_detected) {
      setScore(0);
      setSmoothScore(0);  // 平滑分数也归零
      return;
    }

    // 计算当前帧分数 (0-100)
    const currentScore = Math.round(normalizedConf * 100);
    setScore(currentScore);

    // EMA 平滑分数（用于进度条，alpha=0.7）
    setSmoothScore((prevSmooth) => {
      const newSmooth = EMA_ALPHA * currentScore + (1 - EMA_ALPHA) * prevSmooth;
      return Math.round(newSmooth);
    });

    // 更新统计数据
    setTotal((t) => t + 1);

    // 判断是否命中（predicted 与 target 匹配）
    if (predictedGesture && target && predictedGesture === target) {
      setHits((h) => h + 1);
    }
  }, [EMA_ALPHA]);

  /**
   * 重置所有统计数据
   */
  const reset = useCallback(() => {
    setScore(0);
    setSmoothScore(0);
    setTotal(0);
    setHits(0);
    setLandmarks([]);
    setPredicted(null);
    setConfidence(0);
    setLandmarksOk(false);
    setHandsDetected(false);
    setLatencyMs(0);
    setInferenceMs(0);
  }, []);

  // 计算累计准确率
  const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;

  return {
    score,         // 当前帧分数 (0-100)，实时显示
    smoothScore,   // EMA 平滑后分数 (0-100)，用于进度条
    accuracy,      // 累计准确率 (0-100)
    total,         // 总帧数
    hits,          // 正确帧数
    landmarks,     // 手部关键点数据
    predicted,     // 预测的手势
    confidence,    // 预测置信度 (0-1)
    landmarksOk,   // 关键点质量是否良好
    handsDetected, // 是否检测到手部
    latencyMs,     // 网络延迟（毫秒）
    inferenceMs,   // 推理耗时（毫秒）
    onMessage,     // 处理 WS 消息的回调
    reset,         // 重置统计数据
  };
}

