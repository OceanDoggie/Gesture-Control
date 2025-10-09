#!/usr/bin/env python3
"""
测试AI手势识别系统
确保所有组件正常工作
"""
import os
import sys
import subprocess
import json

def check_python_dependencies():
    """检查Python依赖"""
    print("🔍 检查Python依赖...")
    
    required_packages = [
        'mediapipe', 'opencv-python', 'scikit-learn', 
        'joblib', 'numpy', 'pillow'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")
    
    if missing_packages:
        print(f"\n📦 缺少依赖包: {', '.join(missing_packages)}")
        print("请运行: pip install " + " ".join(missing_packages))
        return False
    
    print("✅ 所有Python依赖已安装")
    return True

def check_files():
    """检查必要文件"""
    print("\n🔍 检查必要文件...")
    
    required_files = [
        'server/ml/asl_dataset.csv',
        'server/ml/gesture_service.py',
        'server/ml/gesture_bridge.py',
        'server/ml/integrated_training.py',
        'server/websocket_service.ts',
        'server/gesture_api.ts',
        'client/src/components/WebcamViewer.tsx'
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            missing_files.append(file_path)
            print(f"❌ {file_path}")
    
    if missing_files:
        print(f"\n📁 缺少文件: {', '.join(missing_files)}")
        return False
    
    print("✅ 所有必要文件存在")
    return True

def test_dataset():
    """测试数据集"""
    print("\n🔍 测试数据集...")
    
    try:
        import csv
        import numpy as np
        
        with open('server/ml/asl_dataset.csv', 'r', newline='') as f:
            reader = csv.reader(f)
            data = list(reader)
        
        if not data:
            print("❌ 数据集为空")
            return False
        
        # 检查数据格式
        sample = data[0]
        if len(sample) < 2:
            print("❌ 数据格式错误")
            return False
        
        # 统计信息
        labels = [row[0] for row in data]
        unique_labels = set(labels)
        
        print(f"✅ 数据集统计:")
        print(f"   总样本数: {len(data)}")
        print(f"   特征维度: {len(sample) - 1}")
        print(f"   手势类型: {len(unique_labels)}")
        print(f"   手势列表: {sorted(unique_labels)}")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据集测试失败: {e}")
        return False

def test_model_training():
    """测试模型训练"""
    print("\n🔍 测试模型训练...")
    
    try:
        # 运行训练脚本
        result = subprocess.run([
            sys.executable, 'server/ml/train_model.py'
        ], capture_output=True, text=True, cwd='.')
        
        if result.returncode == 0:
            print("✅ 模型训练成功")
            return True
        else:
            print(f"❌ 模型训练失败: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ 模型训练测试失败: {e}")
        return False

def test_gesture_service():
    """测试手势识别服务"""
    print("\n🔍 测试手势识别服务...")
    
    try:
        # 测试手势服务导入
        sys.path.append('server/ml')
        from gesture_service import GestureRecognitionService
        
        service = GestureRecognitionService()
        print("✅ 手势识别服务初始化成功")
        
        # 测试手势指导
        instruction = service.get_gesture_instructions('A')
        print(f"✅ 手势指导测试: {instruction['gesture']} - {instruction['instruction']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 手势识别服务测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 AI手势识别系统测试")
    print("=" * 50)
    
    tests = [
        ("Python依赖", check_python_dependencies),
        ("必要文件", check_files),
        ("数据集", test_dataset),
        ("模型训练", test_model_training),
        ("手势服务", test_gesture_service)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 测试: {test_name}")
        if test_func():
            passed += 1
        else:
            print(f"❌ {test_name} 测试失败")
    
    print("\n" + "=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有测试通过！系统准备就绪")
        print("\n🚀 启动系统:")
        print("1. 运行: npm run backend")
        print("2. 运行: npm run dev")
        print("3. 访问: http://localhost:5173")
        print("4. 进入Webcam页面开始AI手势识别")
    else:
        print("❌ 部分测试失败，请检查上述错误")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

