/**
 * Debug 面板组件
 * 显示实时性能指标：延迟、FPS、分数等
 * 按 D 键切换显示/隐藏
 */

import { Activity } from 'lucide-react';

interface DebugPanelProps {
  latencyMs: number;        // 网络延迟（毫秒）
  inferenceMs: number;      // 推理耗时（毫秒）
  wsRecvFps: number;        // WebSocket 接收 FPS
  renderFps: number;        // 渲染 FPS
  scoreNow: number;         // 当前分数 (0-100)
  landmarksOk: boolean;     // 关键点质量是否良好
  show: boolean;            // 是否显示
}

export function DebugPanel({
  latencyMs,
  inferenceMs,
  wsRecvFps,
  renderFps,
  scoreNow,
  landmarksOk,
  show,
}: DebugPanelProps) {
  if (!show) return null;

  // 延迟颜色：<100ms 绿色，<300ms 黄色，>=300ms 红色
  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-green-600';
    if (latency < 300) return 'text-yellow-600';
    return 'text-red-600';
  };

  // FPS 颜色：>=18 绿色，<18 红色
  const getFpsColor = (fps: number) => {
    return fps >= 18 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="absolute top-4 right-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono space-y-1 min-w-[200px] z-50">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
        <Activity className="h-4 w-4 text-blue-400" />
        <span className="font-bold text-blue-400">DEBUG PANEL</span>
      </div>
      
      {/* 延迟指标 */}
      <div className="flex justify-between">
        <span className="text-gray-400">Latency:</span>
        <span className={getLatencyColor(latencyMs)}>
          {latencyMs.toFixed(0)} ms
        </span>
      </div>

      {/* 推理耗时 */}
      <div className="flex justify-between">
        <span className="text-gray-400">Inference:</span>
        <span className={inferenceMs < 80 ? 'text-green-600' : 'text-yellow-600'}>
          {inferenceMs.toFixed(1)} ms
        </span>
      </div>

      {/* WebSocket FPS */}
      <div className="flex justify-between">
        <span className="text-gray-400">WS Recv FPS:</span>
        <span className={getFpsColor(wsRecvFps)}>
          {wsRecvFps}
        </span>
      </div>

      {/* 渲染 FPS */}
      <div className="flex justify-between">
        <span className="text-gray-400">Render FPS:</span>
        <span className={getFpsColor(renderFps)}>
          {renderFps}
        </span>
      </div>

      {/* 当前分数 */}
      <div className="flex justify-between">
        <span className="text-gray-400">Score Now:</span>
        <span className="text-white font-bold">
          {scoreNow}
        </span>
      </div>

      {/* 关键点质量 */}
      <div className="flex justify-between">
        <span className="text-gray-400">Landmarks OK:</span>
        <span className={landmarksOk ? 'text-green-600' : 'text-red-600'}>
          {landmarksOk ? 'YES' : 'NO'}
        </span>
      </div>

      {/* 提示 */}
      <div className="text-gray-500 text-[10px] pt-2 border-t border-white/20">
        按 D 键隐藏
      </div>
    </div>
  );
}








