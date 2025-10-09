#!/usr/bin/env python3
"""
实时手势识别服务 - 使用用户原始代码
基于mediapipeImport.py和AIModelTrain.py
"""
import sys
import json
import base64
import cv2
import mediapipe as mp
import numpy as np
import joblib
import os

# 初始化MediaPipe Hands (来自用户的mediapipeImport.py)
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

# 加载训练好的模型
model = None
# 尝试多个可能的路径
possible_paths = [
    'server/ml/asl_knn_model.pkl',
    'asl_knn_model.pkl',
    os.path.join(os.path.dirname(__file__), 'asl_knn_model.pkl')
]

model_loaded = False
for model_path in possible_paths:
    try:
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            print(json.dumps({'type': 'status', 'message': f'✅ 模型加载成功: {model_path}'}), flush=True)
            model_loaded = True
            break
    except Exception as e:
        continue

if not model_loaded:
    print(json.dumps({'type': 'warning', 'message': '⚠️ 模型文件未找到，使用模拟模式'}), flush=True)

def extract_landmarks(hand_landmarks):
    """提取手部关键点特征"""
    landmarks = []
    for lm in hand_landmarks.landmark:
        landmarks.extend([lm.x, lm.y, lm.z])
    return landmarks

def process_frame(frame_data):
    """处理视频帧并返回识别结果"""
    try:
        # 解码base64图像
        image_data = base64.b64decode(frame_data)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {'type': 'error', 'message': '无法解码图像'}
        
        # 转换为RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # 使用MediaPipe处理帧
        results = hands.process(rgb_frame)
        
        response = {
            'type': 'gesture_result',
            'hands_detected': False,
            'gestures': []
        }
        
        # 如果检测到手部
        if results.multi_hand_landmarks:
            response['hands_detected'] = True
            
            for i, hand_landmarks in enumerate(results.multi_hand_landmarks):
                # 提取关键点
                landmarks = extract_landmarks(hand_landmarks)
                
                # 预测手势（如果模型已加载）
                if model is not None:
                    try:
                        prediction = model.predict([landmarks])[0]
                        confidence = model.predict_proba([landmarks])[0]
                        max_confidence = np.max(confidence)
                        
                        response['gestures'].append({
                            'gesture': prediction,
                            'confidence': float(max_confidence),
                            'message': f'检测到手势: {prediction}',
                            'hand_id': i
                        })
                    except Exception as e:
                        response['gestures'].append({
                            'gesture': 'Error',
                            'confidence': 0.0,
                            'message': f'识别错误: {str(e)}',
                            'hand_id': i
                        })
                else:
                    response['gestures'].append({
                        'gesture': 'Unknown',
                        'confidence': 0.0,
                        'message': '模型未加载',
                        'hand_id': i
                    })
        
        return response
        
    except Exception as e:
        return {'type': 'error', 'message': f'处理帧错误: {str(e)}'}

# 主循环 - 从标准输入读取消息
def main():
    print(json.dumps({'type': 'ready', 'message': '手势识别服务已启动'}), flush=True)
    
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            message = json.loads(line.strip())
            
            if message.get('type') == 'process_frame':
                frame_data = message.get('frame')
                if frame_data:
                    result = process_frame(frame_data)
                    print(json.dumps(result), flush=True)
            
            elif message.get('type') == 'ping':
                print(json.dumps({'type': 'pong', 'status': 'ok'}), flush=True)
                
        except Exception as e:
            print(json.dumps({'type': 'error', 'message': str(e)}), flush=True)

if __name__ == '__main__':
    main()

