# -*- coding: utf-8 -*-
"""
AIModelTrain.py
Train a simple KNN model for ASL gesture classification.

中文说明：
- 读取采集到的关键点CSV（优先：dataset/asl_dataset.csv；否则：asl_dataset.csv）
- 特征顺序与实时推理脚本一致：先所有 x，再所有 y，再所有 z（21点 * 3轴 = 63维）
- 训练 KNN(k=3) 并打印准确率，保存到同目录的 asl_knn_model.pkl
"""

import os
import sys
import csv
import numpy as np
from collections import Counter
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score
import joblib

# -----------------------------
# 路径设置（使用绝对路径更稳）
# -----------------------------
BASE_DIR = os.path.dirname(__file__)  # 当前文件所在目录：server/ml
DATASET_CANDIDATES = [
    os.path.join(BASE_DIR, "dataset", "asl_dataset.csv"),  # 推荐：采集统一写入这里
    os.path.join(BASE_DIR, "asl_dataset.csv"),             # 兼容：历史旧路径
]
MODEL_PATH = os.path.join(BASE_DIR, "asl_knn_model.pkl")

def find_dataset_path() -> str:
    """Return the first existing dataset path or exit with a helpful message."""
    for p in DATASET_CANDIDATES:
        if os.path.exists(p):
            return p
    print(" Dataset not found.\n"
          "Tried:\n - {}\n - {}\n"
          "Please ensure your capture script writes to 'server/ml/dataset/asl_dataset.csv' "
          "or place your CSV next to this file as 'asl_dataset.csv'.".format(*DATASET_CANDIDATES))
    sys.exit(1)

# -----------------------------
# 读取CSV为 (X, y)
# -----------------------------
def load_dataset(csv_path: str):
    """
    Expected CSV format per row:
    label, <63 floats>  # 21 landmarks × (x,y,z)
    NOTE: Realtime inference uses order [all x] + [all y] + [all z],
    so the training data must follow the same order to match runtime.  # 与在线推理保持一致（先x后y再z）
    """
    X, y = [], []

    with open(csv_path, "r", newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            # 跳过空行
            if not row or len(row) < 64:
                continue

            label = row[0].strip()
            try:
                # 将剩余的数值转为 float（应为 63 维：21*3）
                feats = [float(v) for v in row[1:64]]
            except ValueError:
                # 如果遇到非数字行（比如表头），跳过
                continue

            # 这里假设 CSV 中的特征已按 [x1,y1,z1, x2,y2,z2, ...] 存储。
            # 为了与实时推理脚本一致（[所有x]+[所有y]+[所有z]），
            # 我们在这里把顺序重排成同样的形式（如果你的CSV本来就是该顺序，这个重排结果等价）。
            if len(feats) != 63:
                # 数据异常：维度不对
                continue

            # 重排到 [xx.., yy.., zz..]（21个点）
            xs = feats[0::3]  # x1, x2, ..., x21
            ys = feats[1::3]  # y1, y2, ..., y21
            zs = feats[2::3]  # z1, z2, ..., z21
            feats_reordered = xs + ys + zs

            y.append(label)
            X.append(feats_reordered)

    if not X:
        print("No valid samples found in CSV. Please check your data format (label + 63 floats).")
        sys.exit(1)

    X = np.array(X, dtype=np.float32)
    y = np.array(y)
    return X, y

def main():
    csv_path = find_dataset_path()
    print(f"📄 Using dataset: {csv_path}")

    X, y = load_dataset(csv_path)
    n_samples = len(y)
    n_classes = len(set(y))
    print(f"Samples: {n_samples}, Classes: {n_classes}")
    print(f"Label distribution: {Counter(y)}")

    if n_classes < 2:
        print("Need at least 2 classes to train a classifier.")
        sys.exit(1)

    # 分割数据（若类别较少，使用 stratify 更稳）
    stratify = y if n_classes > 1 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    # 训练 KNN（保持与在线推理一致的简洁模型）
    model = KNeighborsClassifier(n_neighbors=3)
    model.fit(X_train, y_train)

    # 评估
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Model accuracy: {acc:.4f}")

    # 保存模型
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")

if __name__ == "__main__":
    main()
