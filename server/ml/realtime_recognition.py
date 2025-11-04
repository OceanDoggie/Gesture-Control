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

# Debug 模式开关（PY_DEBUG 环境变量）
DEBUG = os.getenv("PY_DEBUG", "false").lower() == "true" or os.getenv("DEBUG", "false").lower() == "true"

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

def check_landmarks_quality(landmarks_data, is_raw_points=False):
    """
    检测关键点质量：基于平均可见度和 bbox 面积
    参数:
        landmarks_data: mediapipe hand_landmarks 对象 或 原始点列表 [[x,y,z], ...]
        is_raw_points: 是否为原始点列表（前端发来的格式）
    返回: (landmarks_ok, avg_vis, bbox_area)
    容错判定：avg_vis 默认 1.0（无 visibility 时） && bbox_area > 0.005（放宽到训练数据 10% 分位）
    """
    if is_raw_points:
        # 前端发来的原始点列表 [[x,y,z], ...]
        landmarks = landmarks_data
        # visibility 容错：前端 tasks-vision 不返回 visibility，默认为 1.0
        avg_vis = 1.0
        xs = [p[0] for p in landmarks]
        ys = [p[1] for p in landmarks]
    else:
        # mediapipe 的 hand_landmarks 对象
        landmarks = landmarks_data.landmark
        # 计算平均可见度（容错：无 visibility 字段时默认 1.0）
        visibilities = [getattr(lm, 'visibility', 1.0) for lm in landmarks]
        avg_vis = sum(visibilities) / max(1, len(visibilities))
        xs = [lm.x for lm in landmarks]
        ys = [lm.y for lm in landmarks]
    
    # 计算 bbox 面积
    bbox_w = max(xs) - min(xs)
    bbox_h = max(ys) - min(ys)
    bbox_area = bbox_w * bbox_h
    
    # 放宽判定阈值：bbox_area > 0.005（原来 0.01 太严格）
    # avg_vis 不再作为拦截条件（tasks-vision 无此字段）
    landmarks_ok = (bbox_area > 0.005)
    
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

def normalize_landmarks(points, mirrored=False):
    """
    归一化 landmarks（与训练数据对齐）
    参数:
        points: 21 个 [x, y, z] 点（范围 0~1）
        mirrored: 是否需要镜像对齐（前端 CSS 镜像时为 True）
    返回:
        归一化后的特征向量（63 维：x*21 + y*21 + z*21）
    
    步骤:
    1. 镜像对齐：若 mirrored=True，x = 1 - x
    2. 居中：以手腕点（index 0）为基准
    3. 尺度归一：按手部最大边界缩放
    """
    points = np.array(points, dtype=np.float32)
    
    # 1. 镜像对齐（前端显示镜像时，坐标需要翻转）
    if mirrored:
        points[:, 0] = 1.0 - points[:, 0]  # x 坐标镜像
    
    # 2. 居中：以手腕点（wrist, index=0）为基准
    wrist = points[0].copy()
    points = points - wrist  # 平移到原点
    
    # 3. 尺度归一化：按最大边界缩放到单位尺度
    xs, ys, zs = points[:, 0], points[:, 1], points[:, 2]
    max_range = max(xs.max() - xs.min(), ys.max() - ys.min(), zs.max() - zs.min())
    if max_range > 1e-6:  # 避免除零
        points = points / max_range
    
    # 4. 返回特征向量（与训练时顺序一致：x*21 + y*21 + z*21）
    feature_vector = np.concatenate([points[:, 0], points[:, 1], points[:, 2]])
    
    # Debug 日志：打印前 5 个点的归一化后坐标
    if DEBUG:
        print(json.dumps({
            'type': 'debug',
            'normalized_sample': {
                'point_0': [float(f'{points[0, 0]:.3f}'), float(f'{points[0, 1]:.3f}'), float(f'{points[0, 2]:.3f}')],
                'point_4': [float(f'{points[4, 0]:.3f}'), float(f'{points[4, 1]:.3f}'), float(f'{points[4, 2]:.3f}')],
                'x_range': [float(f'{xs.min():.3f}'), float(f'{xs.max():.3f}')],
                'y_range': [float(f'{ys.min():.3f}'), float(f'{ys.max():.3f}')],
            }
        }), flush=True)
    
    return feature_vector.tolist()

def process_landmarks_input(message):
    """
    处理前端发来的 landmarks 消息（带镜像/单位上下文）
    参数:
        message: {
            type: 'process_landmarks',
            client_id: str,
            points: [[x, y, z], ...],  # 21 个点
            image: { width, height, unit: 'norm01' },
            mirrored: bool,
            target_gesture: str,
            ts: int
        }
    返回:
        符合新协议的 JSON 对象
    """
    global frame_count
    start_time = time.time()
    
    try:
        client_id = message.get('client_id', '')
        points = message.get('points', [])
        image_info = message.get('image', {})
        mirrored = message.get('mirrored', False)
        target_gesture = message.get('target_gesture', '')
        
        # 验证输入
        if len(points) != 21:
            return {'ok': False, 'error': f'Invalid landmarks count: {len(points)} (expected 21)'}
        
        # 单位对齐检查（确保是 norm01）
        unit = image_info.get('unit', 'norm01')
        if unit != 'norm01':
            return {'ok': False, 'error': f'Unsupported unit: {unit} (expected norm01)'}
        
        # 检查关键点质量（使用原始点格式）
        landmarks_ok, avg_vis, bbox_area = check_landmarks_quality(points, is_raw_points=True)
        
        # Debug 日志：打印质量指标
        if DEBUG:
            print(json.dumps({
                'type': 'debug',
                'quality_check': {
                    'avg_vis': round(avg_vis, 3),
                    'bbox_area': round(bbox_area, 4),
                    'landmarks_ok': landmarks_ok,
                    'mirrored': mirrored,
                }
            }), flush=True)
        
        # 定期清理 EMA 缓存
        frame_count += 1
        if frame_count % 100 == 0:
            cleanup_ema_cache()
        
        # 如果质量不佳，返回但不拦截（仅标记）
        inference_time_ms = (time.time() - start_time) * 1000
        
        # 归一化 landmarks（镜像对齐 + 居中 + 尺度归一）
        user_vector = normalize_landmarks(points, mirrored)
        
        # 预测手势
        predicted_label = None
        raw_confidence = 0.0
        probs = None
        
        if model is not None:
            try:
                predicted_label = model.predict([user_vector])[0]
                probs = model.predict_proba([user_vector])[0]
                raw_confidence = float(max(probs))
            except Exception as e:
                print(json.dumps({'type': 'error', 'message': f'模型推理错误: {str(e)}'}), flush=True)
                predicted_label = 'Error'
                raw_confidence = 0.0
        else:
            # 模型未加载
            predicted_label = 'A'
            raw_confidence = 0.75
        
        # 计算推理耗时
        inference_time_ms = (time.time() - start_time) * 1000
        
        # Debug 日志：打印预测结果和概率分布
        if DEBUG and probs is not None and model is not None:
            top3_idx = np.argsort(probs)[-3:][::-1]
            classes = model.classes_
            top3 = [(classes[i], round(float(probs[i]), 3)) for i in top3_idx]
            print(json.dumps({
                'type': 'debug',
                'prediction': {
                    'predicted': predicted_label,
                    'confidence': round(raw_confidence, 3),
                    'top3': top3,
                    'target': target_gesture,
                }
            }), flush=True)
        
        # 性能日志（每帧打印）
        print(json.dumps({
            'type': 'perf',
            'avg_vis': round(avg_vis, 3),
            'bbox_area': round(bbox_area, 4),
            'landmarks_ok': landmarks_ok,
            'predicted': predicted_label,
            'target': target_gesture,
            'confidence': round(raw_confidence, 3),
            'inference_ms': round(inference_time_ms, 2)
        }), flush=True)
        
        # 计算得分（与目标手势匹配时 = confidence * 100，否则较低分）
        score = 0.0
        if target_gesture and predicted_label == target_gesture:
            score = raw_confidence * 100
        elif target_gesture:
            score = max(0, raw_confidence * 30)  # 错误手势给予低分
        else:
            score = raw_confidence * 100  # 无目标时按置信度给分
        
        # 返回结果
        return {
            'ok': True,
            'data': {
                'type': 'gesture_result',
                'client_id': client_id,
                'hands_detected': True,
                'target': target_gesture,
                'predicted': predicted_label,
                'confidence': float(raw_confidence),
                'score': round(score, 2),
                'landmarks_ok': landmarks_ok,
                'landmarks': [{'x': float(p[0]), 'y': float(p[1]), 'visibility': 1.0} for p in points],
                'server_ts': int(time.time() * 1000),
                'inference_ms': round(inference_time_ms, 2)
            }
        }
        
    except Exception as e:
        return {'ok': False, 'error': f'处理 landmarks 错误: {str(e)}'}


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
    print(json.dumps({'type': 'ready', 'message': '✅ 带评分系统的手势识别服务已启动（支持 landmarks 输入）'}), flush=True)
    if DEBUG:
        print(json.dumps({'type': 'debug', 'message': '🔧 Debug 模式已启用（PY_DEBUG=1）'}), flush=True)
    
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            message = json.loads(line.strip())
            msg_type = message.get('type')
            
            if msg_type == 'process_landmarks':
                # 处理前端发来的 landmarks（新路径：性能更优，无需重复检测）
                result = process_landmarks_input(message)
                print(json.dumps(result), flush=True)
            
            elif msg_type == 'process_frame':
                # 处理图像帧（旧路径：兼容保留）
                frame_data = message.get('frame') or message.get('frame_data')
                target_gesture = message.get('target_gesture', '')
                client_id = message.get('client_id', '')
                
                if frame_data:
                    result = process_frame(frame_data, target_gesture, client_id)
                    print(json.dumps(result), flush=True)
            
            elif msg_type == 'ping':
                print(json.dumps({'type': 'pong', 'status': 'ok'}), flush=True)
                
        except Exception as e:
            print(json.dumps({'type': 'error', 'message': str(e)}), flush=True)

if __name__ == '__main__':
    main()


