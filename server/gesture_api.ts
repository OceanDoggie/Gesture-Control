/**
 * 手势识别API端点
 */
import { Request, Response } from 'express';
import { PythonShell } from 'python-shell';
import { log } from './vite.js';

// 手势识别API类
class GestureAPI {
  private pythonProcess: PythonShell | null = null;

  constructor() {
    this.initializePythonService();
  }

  private initializePythonService() {
    try {
      // 使用环境变量配置 Python 路径和模型目录
      const pythonBin = process.env.PYTHON_BIN || 'python3';
      const modelDir = process.env.MODEL_DIR || 'server/ml';
      const scriptPath = `${modelDir}/realtime_recognition.py`;

      console.log(`🐍 使用 Python: ${pythonBin}`);
      console.log(`📁 模型目录: ${modelDir}`);
      console.log(`📜 脚本路径: ${scriptPath}`);

      this.pythonProcess = new PythonShell(scriptPath, {
        mode: 'json',
        pythonPath: pythonBin,
        args: []
      });

      this.pythonProcess.on('message', (message: any) => {
        console.log(`🐍 Python服务响应: ${JSON.stringify(message)}`);
        log(`🐍 Python服务响应: ${JSON.stringify(message)}`);
      });

      this.pythonProcess.on('stderr', (stderr: string) => {
        console.error(`🐍 Python stderr: ${stderr}`);
        log(`🐍 Python错误: ${stderr}`);
      });

      this.pythonProcess.on('error', (error: Error) => {
        console.error(`🐍 Python进程错误: ${error.message}`);
      });

      this.pythonProcess.on('close', (code: number) => {
        console.log(`🐍 Python进程退出，代码: ${code}`);
      });

      console.log('✅ Python手势识别服务已初始化');
      log('✅ Python手势识别服务已初始化');
    } catch (error) {
      console.error(`❌ 初始化Python服务失败: ${error}`);
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

  // 获取手势指导 (Get gesture instructions - English only)
  getGestureInstructions(req: Request, res: Response) {
    const { gesture } = req.params;
    
    const instructions = {
      'A': {
        gesture: 'A',
        instruction: 'Make a fist with your thumb on top of other fingers',
        practice_tip: 'Try making the A gesture and keep your hand steady',
        difficulty: 'Easy'
      },
      'B': {
        gesture: 'B',
        instruction: 'Open your palm with fingers together',
        practice_tip: 'Keep your fingers straight and palm flat',
        difficulty: 'Easy'
      },
      'C': {
        gesture: 'C',
        instruction: 'Curve your fingers like you\'re grabbing something',
        practice_tip: 'Curve your fingers in an arc, like holding a ball',
        difficulty: 'Medium'
      },
      'D': {
        gesture: 'D',
        instruction: 'Extend your index finger, other fingers in a fist',
        practice_tip: 'Keep index finger straight, other fingers tight',
        difficulty: 'Easy'
      },
      'E': {
        gesture: 'E',
        instruction: 'Thumbs up, other fingers in a fist',
        practice_tip: 'Thumb pointing up, other fingers tight',
        difficulty: 'Easy'
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
