/**
 * WebcamOverlay 组件
 * 在摄像头画面上叠加显示实时评分信息
 * 
 * 功能:
 * - 右上角 Badge：显示 Live Score 和颜色编码
 * - 底部进度条：反映当前帧分数（0-100）
 * - 无手检测提示
 * - 可选显示调试信息（predicted、landmarks_ok）
 */

import React from 'react';
import { useI18n } from '../hooks/useI18n';

interface WebcamOverlayProps {
  score: number;             // 当前帧分数 (0-100)，用于 Live Score 显示
  smoothScore?: number;      // EMA 平滑分数 (0-100)，用于进度条
  handsDetected?: boolean;   // 是否检测到手部
  predicted?: string | null; // 预测的手势
  landmarksOk?: boolean;     // 关键点质量是否良好
  showDebug?: boolean;       // 是否显示调试信息
  fps?: number;              // 渲染 FPS
}

export function WebcamOverlay({
  score,
  smoothScore,
  handsDetected = true,
  predicted,
  landmarksOk = true,
  showDebug = false,
  fps = 0,
}: WebcamOverlayProps) {
  const lang = useI18n();

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

  return (
    <div className="pointer-events-none absolute inset-0">
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

