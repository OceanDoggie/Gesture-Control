#!/bin/bash
# Git 提交命令 - 评分链路对齐
# 使用方法：
#   chmod +x git-commit-commands.sh
#   ./git-commit-commands.sh

# 切换到项目根目录
cd "$(dirname "$0")"

echo "📦 开始提交评分链路对齐改动..."

# 创建新分支（如果不存在）
git checkout -b fix/scoring-preprocess-align 2>/dev/null || git checkout fix/scoring-preprocess-align

# 添加前端文件
echo "✅ 添加前端文件..."
git add client/src/components/WebcamViewer.tsx
git add client/src/components/WebcamOverlay.tsx
git add client/src/hooks/useGestureScore.ts

# 添加后端文件
echo "✅ 添加后端文件..."
git add server/websocket_service.ts
git add server/ml/realtime_recognition.py

# 添加文档
echo "✅ 添加文档..."
git add SCORING_ALIGNMENT_VERIFICATION.md
git add 评分链路对齐-实施总结.md

# 提交（使用规范的 commit message）
echo "✅ 提交改动..."
git commit -m "fix(scoring): align preprocessing to tasks-vision (mirroring/unit/visibility); show predicted label

## 改动概述
实现最小改动 + 零风险部署的评分链路对齐

## 前端改动
- WebcamViewer: 发送 landmarks 时携带 mirrored/unit/image 上下文
- WebcamOverlay: 显示预测类别 & 置信度卡片
- useGestureScore: 增加 confidence 状态

## 后端改动
- websocket_service: 处理新的 landmarks 消息类型
- realtime_recognition: 预处理容错 & 归一化对齐
  * visibility 容错（默认 1.0）
  * bbox 阈值放宽（0.01 → 0.005）
  * 镜像对齐（mirrored=true 时 x 翻转）
  * 归一化（居中 + 尺度）
  * Debug 日志增强（PY_DEBUG=1）

## 验收标准
- Live Score 随正确手势稳定提升（2-3秒内 0→70+）
- 预测准确（predicted=target, confidence>=0.7）
- 后端日志正常（landmarks_ok=true, bbox_area合理）
- UI 显示预测结果卡片

## 约束遵守
- ✅ 未修改 package.json
- ✅ 未修改 Render 配置
- ✅ 保留旧 frame_data 路径兼容
- ✅ 代码改动 < 300 行"

echo "✅ 提交完成！"
echo ""
echo "📊 查看提交信息："
git log -1 --stat

echo ""
echo "🚀 下一步操作："
echo "1. 本地验收测试（参考 SCORING_ALIGNMENT_VERIFICATION.md）"
echo "2. 推送到远程：git push origin fix/scoring-preprocess-align"
echo "3. 创建 Pull Request"
echo ""
echo "💡 提示：如需回退，执行："
echo "   git reset --soft HEAD~1  # 保留修改"
echo "   git reset --hard HEAD~1  # 丢弃修改"

