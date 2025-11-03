/**
 * WebcamOverlay 组件
 * 在摄像头画面上叠加显示实时评分信息
 * 
 * 功能:
 * - 右上角 Badge：显示 Live Score 和颜色编码
 * - 底部进度条：反映当前帧分数（0-100）
 * - 无手检测提示
 * - 可选显示调试信息（predicted、landmarks_ok）
 * - 任务 B：绘制 21 个手部关键点
 */

import React, { useRef, useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';

interface WebcamOverlayProps {
  score: number;             // 当前帧分数 (0-100)，用于 Live Score 显示
  smoothScore?: number;      // EMA 平滑分数 (0-100)，用于进度条
  handsDetected?: boolean;   // 是否检测到手部
  predicted?: string | null; // 预测的手势
  landmarksOk?: boolean;     // 关键点质量是否良好
  showDebug?: boolean;       // 是否显示调试信息
  fps?: number;              // 渲染 FPS
  landmarks?: any;           // 任务 B：MediaPipe landmarks 数据
  videoMirrored?: boolean;   // 视频是否镜像
}

export function WebcamOverlay({
  score,
  smoothScore,
  handsDetected = true,
  predicted,
  landmarksOk = true,
  showDebug = false,
  fps = 0,
  landmarks,          // 任务 B：新增 landmarks prop
  videoMirrored = true, // 任务 B：新增镜像状态
}: WebcamOverlayProps) {
  const lang = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null); // 任务 B：用于绘制 landmarks 的 canvas

  // 使用平滑分数（如果提供），否则使用当前分数
  const progressScore = smoothScore !== undefined ? smoothScore : score;

  /**
   * 根据分数区间确定颜色（基于当前分数，更灵敏）
   * - 绿色: 90+  (优秀)
   * - 橙色: 75-89 (良好)
   * - 黄色: 60-74 (合格)
   * - 红色: <60   (需要改进)
   */
  const getColor = () => {
    if (score >= 90) return 'bg-green-600';
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const colorClass = getColor();

  /**
   * 任务 B：绘制 MediaPipe 手部关键点（21 个点）
   * 在 canvas 上绘制圆点
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取 canvas 的父容器（video）尺寸
    const parent = canvas.parentElement;
    if (!parent) return;

    // 设置 canvas 尺寸与父容器一致
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    // 清空 canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 如果有 landmarks 且检测到手，绘制关键点
    if (handsDetected && landmarks && landmarks.length > 0) {
      const pts = landmarks[0] ?? []; // 取第一只手的关键点
      
      ctx.save();
      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)'; // 绿色半透明
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // 白色边框
      ctx.lineWidth = 1;

      // 绘制 21 个关键点
      for (const p of pts) {
        // MediaPipe 的坐标是归一化的 (0-1)，需要映射到 canvas 尺寸
        let x = p.x * canvas.width;
        const y = p.y * canvas.height;

        // 如果视频镜像，x 坐标需要反转
        if (videoMirrored) {
          x = canvas.width - x;
        }

        // 绘制圆点
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2); // 半径 4px
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [handsDetected, landmarks, videoMirrored]); // 依赖项：当这些值变化时重新绘制

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* 任务 B：绘制 landmarks 的 canvas（叠加在最上层） */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* 无手检测提示（居中显示） */}
      {!handsDetected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/70 text-white px-6 py-3 rounded-lg shadow-xl">
            <p className="text-lg font-medium">{lang.stats.noHandDetected}</p>
          </div>
        </div>
      )}

      {/* 右上角：Live Score Badge（仅在检测到手时显示） */}
      {handsDetected && (
        <div className="absolute top-3 right-3 space-y-2">
          <div className={`text-white px-3 py-1.5 rounded-lg shadow-lg font-medium ${colorClass}`}>
            {lang.stats.liveScore}: {score}
          </div>
          
          {/* 调试信息（可选，按 D 键切换） */}
          {showDebug && (
            <div className="bg-black/80 text-white px-2 py-1.5 rounded text-xs space-y-1 font-mono">
              <div className="font-semibold text-yellow-400">Debug Info (Press D to hide)</div>
              {predicted && <div>Predicted: <span className="text-cyan-400">{predicted}</span></div>}
              <div>
                Quality: <span className={landmarksOk ? 'text-green-400' : 'text-red-400'}>
                  {landmarksOk ? lang.stats.goodQuality : lang.stats.poorQuality}
                </span>
              </div>
              <div>FPS: <span className="text-green-400">{fps}</span></div>
            </div>
          )}
        </div>
      )}

      {/* 底部：进度条（使用平滑分数，视觉更稳定） */}
      {handsDetected && (
        <div className="absolute bottom-3 left-3 right-3">
          <div className="h-2 bg-gray-200/80 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
              style={{ width: `${progressScore}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

