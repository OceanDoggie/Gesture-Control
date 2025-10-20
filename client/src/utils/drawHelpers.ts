/**
 * 手部关键点绘制工具
 * 用于在 Canvas 上绘制 MediaPipe Hands 的 21 个关键点和骨架连接
 */

/**
 * MediaPipe Hands 骨架连接定义
 * 每个子数组表示两个关键点之间的连接 [起点索引, 终点索引]
 */
export const HAND_CONNECTIONS = [
  // 拇指 (Thumb)
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  
  // 食指 (Index finger)
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  
  // 中指 (Middle finger)
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  
  // 无名指 (Ring finger)
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  
  // 小指 (Pinky)
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  
  // 手掌连接 (Palm)
  [5, 9],
  [9, 13],
  [13, 17],
];

/**
 * 单个关键点数据结构
 */
export interface Landmark {
  x: number;          // 归一化 x 坐标 (0-1)
  y: number;          // 归一化 y 坐标 (0-1)
  visibility: number; // 可见性 (0-1)
}

/**
 * 绘制手部关键点和骨架
 * 
 * @param ctx - Canvas 2D 绘图上下文
 * @param landmarks - 21 个手部关键点数组
 * @param width - Canvas 宽度
 * @param height - Canvas 高度
 * @param landmarksOk - 关键点质量是否良好
 * @param mirrored - 是否镜像绘制（如果 video 做了水平镜像，此参数应为 true）
 */
export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  landmarksOk: boolean,
  mirrored: boolean = false
): void {
  // 如果关键点不足 21 个，不绘制
  if (!landmarks || landmarks.length < 21) {
    return;
  }

  // 根据质量选择颜色
  const color = landmarksOk ? '#00AAFF' : 'rgba(255, 0, 0, 0.6)';
  const lineWidth = 2;
  const pointRadius = 3;

  // 坐标转换函数（支持镜像）
  const transformX = (x: number) => mirrored ? (1 - x) * width : x * width;
  const transformY = (y: number) => y * height;

  // 绘制连接线
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  HAND_CONNECTIONS.forEach(([i, j]) => {
    const p1 = landmarks[i];
    const p2 = landmarks[j];

    // 检查关键点是否有效
    if (!p1 || !p2) return;

    const x1 = transformX(p1.x);
    const y1 = transformY(p1.y);
    const x2 = transformX(p2.x);
    const y2 = transformY(p2.y);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // 绘制关键点（圆点）
  ctx.fillStyle = color;
  landmarks.forEach((lm) => {
    if (!lm) return;

    const x = transformX(lm.x);
    const y = transformY(lm.y);

    ctx.beginPath();
    ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
    ctx.fill();
  });
}

/**
 * 清空 Canvas
 * 
 * @param ctx - Canvas 2D 绘图上下文
 * @param width - Canvas 宽度
 * @param height - Canvas 高度
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}

/**
 * 在 Canvas 上绘制文本提示
 * 
 * @param ctx - Canvas 2D 绘图上下文
 * @param text - 要显示的文本
 * @param x - x 坐标
 * @param y - y 坐标
 * @param options - 可选样式配置
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options?: {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    align?: CanvasTextAlign;
  }
): void {
  const {
    color = 'white',
    fontSize = 16,
    fontFamily = 'sans-serif',
    align = 'center',
  } = options || {};

  ctx.fillStyle = color;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}


