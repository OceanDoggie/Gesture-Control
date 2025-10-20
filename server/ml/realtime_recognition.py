#!/usr/bin/env python3
"""
实时手势识别服务（带打分系统）
整合Mediapipe.py的打分功能 + EMA 平滑 + 置信度计算
新增：landmarks 数据、client_id 隔离、EMA 缓存清理、debug 日志
"""
import sys
import json
import base64
import cv2
import mediapipe as mp
import numpy as np
import joblib
import os
import time
from collections import defaultdict

# 初始化MediaPipe Hands
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
    print(json.dumps({'type': 'warning', 'message': '⚠️ 模型文件未找到'}), flush=True)

# EMA 平滑配置（支持 client_id 隔离）
ema_conf = {}  # key: "client_id:target" -> (value, timestamp)
EMA_ALPHA = 0.35  # 平滑系数
MAX_CACHE_AGE = 300  # EMA 缓存过期时间（秒）= 5 分钟
frame_count = 0  # 帧计数器，用于定期清理缓存

# Debug 模式开关
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

def extract_landmarks(hand_landmarks):
    """提取手部关键点特征（与训练时一致）"""
    # 按照训练时的特征顺序：x坐标 + y坐标 + z坐标
    user_vector = []
    user_vector.extend([lm.x for lm in hand_landmarks.landmark])
    user_vector.extend([lm.y for lm in hand_landmarks.landmark])
    user_vector.extend([lm.z for lm in hand_landmarks.landmark])
    return user_vector

def ema_smooth(client_id, target, value):
    """
    指数移动平均平滑函数（支持 client_id 隔离）
    参数:
        client_id: 客户端唯一标识
        target: 目标手势
        value: 当前帧的原始置信度
    返回:
        平滑后的置信度
    """
    key = f"{client_id}:{target}"
    prev_value, _ = ema_conf.get(key, (0.0, 0))
    smoothed = EMA_ALPHA * value + (1 - EMA_ALPHA) * prev_value
    ema_conf[key] = (smoothed, time.time())
    return smoothed

def check_landmarks_quality(hand_landmarks):
    """
    检测关键点质量：基于平均可见度和 bbox 面积
    返回: (landmarks_ok, avg_vis, bbox_area)
    放宽判定：avg_vis > 0.45 && bbox_area > 0.01（性能优化）
    """
    landmarks = hand_landmarks.landmark
    
    # 计算平均可见度
    visibilities = [getattr(lm, 'visibility', 1.0) for lm in landmarks]
    avg_vis = sum(visibilities) / max(1, len(visibilities))
    
    # 计算 bbox 面积
    xs = [lm.x for lm in landmarks]
    ys = [lm.y for lm in landmarks]
    bbox_w = max(xs) - min(xs)
    bbox_h = max(ys) - min(ys)
    bbox_area = bbox_w * bbox_h
    
    # 放宽判定阈值（优化性能）
    landmarks_ok = (avg_vis > 0.45 and bbox_area > 0.01)
    
    return landmarks_ok, avg_vis, bbox_area

def cleanup_ema_cache():
    """
    清理过期的 EMA 缓存（基于时间）
    每 100 帧调用一次，删除超过 MAX_CACHE_AGE 秒未更新的缓存
    """
    now = time.time()
    expired_keys = [
        key for key, (value, timestamp) in ema_conf.items()
        if now - timestamp > MAX_CACHE_AGE
    ]
    for key in expired_keys:
        del ema_conf[key]
    
    if expired_keys and DEBUG:
        print(json.dumps({
            'type': 'debug',
            'message': f'Cleaned {len(expired_keys)} expired EMA cache entries'
        }), flush=True)

def calculate_grade(confidence):
    """
    计算评分等级（来自Mediapipe.py的打分系统）
    """
    if confidence >= 0.9:
        return "A", "优秀"
    elif confidence >= 0.75:
        return "B", "良好"
    elif confidence >= 0.6:
        return "C", "合格"
    else:
        return "D", "需要改进"

def process_frame(frame_data, target_gesture="", client_id=""):
    """
    处理视频帧并返回识别结果（性能优化版：去掉降权，保留原始confidence）
    参数:
        frame_data: base64 编码的图像数据
        target_gesture: 目标手势（用于评分）
        client_id: 客户端唯一标识（用于 EMA 隔离）
    返回:
        符合新协议的 JSON 对象
    """
    global frame_count
    start_time = time.time()  # 记录开始时间，用于计算推理耗时
    
    try:
        # 解码base64图像
        image_data = base64.b64decode(frame_data)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {'ok': False, 'error': '无法解码图像'}
        
        # 转换为RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # 使用MediaPipe处理帧
        results = hands.process(rgb_frame)
        
        # 定期清理 EMA 缓存（每 100 帧）
        frame_count += 1
        if frame_count % 100 == 0:
            cleanup_ema_cache()
        
        # 如果未检测到手部（添加 server_ts 和 inference_ms）
        inference_time_ms = (time.time() - start_time) * 1000
        if not results.multi_hand_landmarks:
            return {
                'ok': True,
                'data': {
                    'type': 'gesture_result',
                    'client_id': client_id,
                    'hands_detected': False,
                    'target': target_gesture,
                    'predicted': None,
                    'confidence': 0.0,
                    'landmarks_ok': False,
                    'landmarks': [],
                    'server_ts': int(time.time() * 1000),  # 服务器时间戳（毫秒）
                    'inference_ms': round(inference_time_ms, 2)  # 推理耗时（毫秒）
                }
            }
        
        # 检测到手部 - 处理第一个手势（主手）
        hand_landmarks = results.multi_hand_landmarks[0]
        
        # 检查关键点质量（返回 landmarks_ok, avg_vis, bbox_area）
        landmarks_ok, avg_vis, bbox_area = check_landmarks_quality(hand_landmarks)
        
        # 提取关键点数据（用于前端绘制）
        landmarks = [
            {
                'x': float(lm.x),
                'y': float(lm.y),
                'visibility': float(getattr(lm, 'visibility', 1.0))
            }
            for lm in hand_landmarks.landmark
        ]
        
        # 提取关键点特征（用于模型预测）
        user_vector = extract_landmarks(hand_landmarks)
        
        # 预测手势
        predicted_label = None
        raw_confidence = 0.0
        probs = None
        
        if model is not None:
            try:
                # 使用 KNN 模型预测
                predicted_label = model.predict([user_vector])[0]
                probs = model.predict_proba([user_vector])[0]
                raw_confidence = float(max(probs))
            except Exception as e:
                print(json.dumps({'type': 'error', 'message': f'模型推理错误: {str(e)}'}), flush=True)
                predicted_label = 'Error'
                raw_confidence = 0.0
        else:
            # 模型未加载时的模拟数据
            predicted_label = 'A'
            raw_confidence = 0.75
        
        # 计算推理耗时（毫秒）
        inference_time_ms = (time.time() - start_time) * 1000
        
        # 打印质量指标和推理耗时（每帧都打印，用于性能监控）
        print(json.dumps({
            'type': 'perf',
            'avg_vis': round(avg_vis, 3),
            'bbox_area': round(bbox_area, 4),
            'landmarks_ok': landmarks_ok,
            'inference_ms': round(inference_time_ms, 2)
        }), flush=True)
        
        # Debug 日志：打印概率分布（仅在 DEBUG 模式下）
        if DEBUG and probs is not None and model is not None:
            # 获取 top-3 概率
            top3_idx = np.argsort(probs)[-3:][::-1]
            classes = model.classes_
            top3 = [(classes[i], round(float(probs[i]), 3)) for i in top3_idx]
            print(json.dumps({
                'type': 'debug',
                'top3_probs': top3
            }), flush=True)
        
        # ⚠️ 性能优化：去掉质量降权和错类降权，保留原始 confidence
        # 直接使用原始 confidence，用于 A/B 测试
        final_confidence = raw_confidence
        
        # 返回新协议格式（添加 server_ts 和 inference_ms）
        return {
            'ok': True,
            'data': {
                'type': 'gesture_result',
                'client_id': client_id,
                'hands_detected': True,
                'target': target_gesture,
                'predicted': predicted_label,
                'confidence': float(final_confidence),  # 原始 confidence，不再降权
                'landmarks_ok': landmarks_ok,
                'landmarks': landmarks,
                'server_ts': int(time.time() * 1000),  # 服务器时间戳（毫秒）
                'inference_ms': round(inference_time_ms, 2)  # 推理耗时（毫秒）
            }
        }
        
    except Exception as e:
        return {'ok': False, 'error': f'处理帧错误: {str(e)}'}


# 主循环 - 从标准输入读取消息
def main():
    print(json.dumps({'type': 'ready', 'message': '✅ 带评分系统的手势识别服务已启动'}), flush=True)
    
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            message = json.loads(line.strip())
            
            if message.get('type') == 'process_frame':
                frame_data = message.get('frame') or message.get('frame_data')
                target_gesture = message.get('target_gesture', '')  # 获取目标手势
                client_id = message.get('client_id', '')  # 获取客户端 ID
                
                if frame_data:
                    result = process_frame(frame_data, target_gesture, client_id)
                    print(json.dumps(result), flush=True)
            
            elif message.get('type') == 'ping':
                print(json.dumps({'type': 'pong', 'status': 'ok'}), flush=True)
                
        except Exception as e:
            print(json.dumps({'type': 'error', 'message': str(e)}), flush=True)

if __name__ == '__main__':
    main()


