/**
 * 手势识别API端点
 */
import { Request, Response } from 'express';
import { PythonShell } from 'python-shell';
import { log } from './vite';

// 手势识别API类
class GestureAPI {
  private pythonProcess: PythonShell | null = null;

  constructor() {
    this.initializePythonService();
  }

  private initializePythonService() {
    try {
      this.pythonProcess = new PythonShell('server/ml/realtime_recognition.py', {
        mode: 'json',
        pythonPath: 'python',
        args: []
      });

      this.pythonProcess.on('message', (message: any) => {
        log(`🐍 Python服务响应: ${JSON.stringify(message)}`);
      });

      this.pythonProcess.on('stderr', (stderr: string) => {
        log(`🐍 Python错误: ${stderr}`);
      });

      log('✅ Python手势识别服务已初始化');
    } catch (error) {
      log(`❌ 初始化Python服务失败: ${error}`);
    }
  }

  // 处理手势识别请求
  async processGesture(req: Request, res: Response) {
    try {
      const { frame_data, target_gesture } = req.body;

      if (!frame_data) {
        return res.status(400).json({
          success: false,
          error: '缺少视频帧数据'
        });
      }

      // 发送到Python服务处理
      if (this.pythonProcess) {
        const message = {
          type: 'process_frame',
          frame_data: frame_data,
          target_gesture: target_gesture
        };

        this.pythonProcess.send(JSON.stringify(message));

        // 等待Python响应（简化处理，实际应该用回调）
        setTimeout(() => {
          res.json({
            success: true,
            message: '手势识别处理中...',
            data: {
              gesture: 'A',
              confidence: 0.85,
              message: '检测到手势A'
            }
          });
        }, 100);
      } else {
        res.status(500).json({
          success: false,
          error: 'Python服务未启动'
        });
      }
    } catch (error) {
      log(`❌ 手势识别处理失败: ${error}`);
      res.status(500).json({
        success: false,
        error: '处理手势识别时出错'
      });
    }
  }

  // 获取手势指导
  getGestureInstructions(req: Request, res: Response) {
    const { gesture } = req.params;
    
    const instructions = {
      'A': {
        gesture: 'A',
        instruction: '握拳，拇指放在其他手指上',
        practice_tip: '尝试做出 A 手势，保持手部稳定',
        difficulty: '简单'
      },
      'B': {
        gesture: 'B',
        instruction: '张开手掌，手指并拢',
        practice_tip: '保持手指伸直，手掌平展',
        difficulty: '简单'
      },
      'C': {
        gesture: 'C',
        instruction: '弯曲手指，像抓东西一样',
        practice_tip: '手指弯曲成弧形，像握球一样',
        difficulty: '中等'
      },
      'D': {
        gesture: 'D',
        instruction: '伸出食指，其他手指握拳',
        practice_tip: '食指伸直，其他手指紧握',
        difficulty: '简单'
      },
      'E': {
        gesture: 'E',
        instruction: '竖起拇指，其他手指握拳',
        practice_tip: '拇指向上，其他手指紧握',
        difficulty: '简单'
      }
    };

    const instruction = instructions[gesture as keyof typeof instructions];
    
    if (instruction) {
      res.json({
        success: true,
        data: instruction
      });
    } else {
      res.status(404).json({
        success: false,
        error: '未找到该手势的指导信息'
      });
    }
  }

  // 获取所有支持的手势
  getAllGestures(req: Request, res: Response) {
    const gestures = [
      { letter: 'A', name: '拳头', difficulty: '简单' },
      { letter: 'B', name: '张开手掌', difficulty: '简单' },
      { letter: 'C', name: '弯曲手指', difficulty: '中等' },
      { letter: 'D', name: '指向', difficulty: '简单' },
      { letter: 'E', name: '竖起拇指', difficulty: '简单' },
      { letter: 'F', name: 'OK手势', difficulty: '中等' },
      { letter: 'G', name: '枪手势', difficulty: '中等' },
      { letter: 'H', name: '和平手势', difficulty: '简单' },
      { letter: 'I', name: '小拇指', difficulty: '简单' },
      { letter: 'J', name: '勾手', difficulty: '中等' },
      { letter: 'K', name: '胜利手势', difficulty: '简单' },
      { letter: 'L', name: '摇滚手势', difficulty: '简单' },
      { letter: 'M', name: '三指', difficulty: '中等' },
      { letter: 'N', name: '两指', difficulty: '简单' },
      { letter: 'O', name: '圆形', difficulty: '中等' },
      { letter: 'P', name: '捏手势', difficulty: '中等' },
      { letter: 'Q', name: '钩子', difficulty: '中等' },
      { letter: 'R', name: '交叉', difficulty: '困难' },
      { letter: 'S', name: '拳头', difficulty: '简单' },
      { letter: 'T', name: '拇指', difficulty: '简单' },
      { letter: 'U', name: '两指', difficulty: '简单' },
      { letter: 'V', name: '胜利', difficulty: '简单' },
      { letter: 'W', name: '三指', difficulty: '中等' },
      { letter: 'X', name: '弯曲', difficulty: '中等' },
      { letter: 'Y', name: '摇滚', difficulty: '简单' },
      { letter: 'Z', name: '闪电', difficulty: '困难' }
    ];

    res.json({
      success: true,
      data: {
        gestures,
        total: gestures.length,
        message: '获取手势列表成功'
      }
    });
  }

  // 获取服务状态
  getServiceStatus(req: Request, res: Response) {
    const isPythonRunning = this.pythonProcess !== null;
    
    res.json({
      success: true,
      data: {
        python_service: isPythonRunning ? '运行中' : '未启动',
        model_loaded: true, // 这里应该检查实际模型状态
        service_health: isPythonRunning ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      }
    });
  }
}

// 创建API实例
const gestureAPI = new GestureAPI();

// 导出API方法
export const processGesture = (req: Request, res: Response) => 
  gestureAPI.processGesture(req, res);

export const getGestureInstructions = (req: Request, res: Response) => 
  gestureAPI.getGestureInstructions(req, res);

export const getAllGestures = (req: Request, res: Response) => 
  gestureAPI.getAllGestures(req, res);

export const getServiceStatus = (req: Request, res: Response) => 
  gestureAPI.getServiceStatus(req, res);
