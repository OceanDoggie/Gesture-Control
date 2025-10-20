#!/usr/bin/env node
/**
 * 模型下载脚本
 * 在构建或启动时自动检测并下载 ML 模型文件
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取模型目录（支持环境变量配置）
const MODEL_DIR = process.env.MODEL_DIR || join(__dirname, '../server/ml');
const MODEL_FILE = join(MODEL_DIR, 'asl_knn_model.pkl');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 检查模型文件...');
console.log(`📁 模型目录: ${MODEL_DIR}`);
console.log(`📄 模型文件: ${MODEL_FILE}`);

// 确保模型目录存在
if (!existsSync(MODEL_DIR)) {
  console.log('📁 创建模型目录...');
  mkdirSync(MODEL_DIR, { recursive: true });
}

// 检查模型文件是否存在
if (existsSync(MODEL_FILE)) {
  console.log('✅ 模型文件已存在，跳过下载');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

console.log('⬇️  模型文件不存在，准备下载...');

// 模型下载 URL（可以配置为环境变量）
const MODEL_URL = process.env.MODEL_DOWNLOAD_URL || 
  'https://github.com/your-repo/releases/download/v1.0.0/asl_knn_model.pkl';

console.log(`🌐 下载地址: ${MODEL_URL}`);

try {
  // 使用 curl 或 wget 下载（根据系统可用性选择）
  let downloadCmd;
  
  try {
    execSync('which curl', { stdio: 'pipe' });
    downloadCmd = `curl -L -o "${MODEL_FILE}" "${MODEL_URL}"`;
    console.log('📥 使用 curl 下载模型...');
  } catch {
    try {
      execSync('which wget', { stdio: 'pipe' });
      downloadCmd = `wget -O "${MODEL_FILE}" "${MODEL_URL}"`;
      console.log('📥 使用 wget 下载模型...');
    } catch {
      console.error('❌ 错误: 系统中未找到 curl 或 wget');
      console.error('   请手动安装其中一个工具，或手动下载模型文件到:');
      console.error(`   ${MODEL_FILE}`);
      process.exit(1);
    }
  }

  // 执行下载
  execSync(downloadCmd, { stdio: 'inherit' });
  
  // 验证下载是否成功
  if (existsSync(MODEL_FILE)) {
    console.log('✅ 模型下载完成！');
  } else {
    console.error('❌ 下载失败：模型文件未创建');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ 下载模型时出错:', error.message);
  console.error('\n💡 提示: 如果模型托管在私有仓库，请设置以下环境变量:');
  console.error('   MODEL_DOWNLOAD_URL=<你的模型下载地址>');
  console.error('\n或者手动下载模型文件并放置到:');
  console.error(`   ${MODEL_FILE}`);
  
  // 不退出进程，允许在没有模型的情况下启动（某些部署环境可能不需要 ML 功能）
  console.log('\n⚠️  警告: 继续启动，但 ML 功能可能不可用');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

