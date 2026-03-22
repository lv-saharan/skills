/**
 * 全局测试设置
 * 
 * 在所有测试运行前执行，用于：
 * - 验证 Cookie 文件存在
 * - 安装浏览器（如未安装）
 * - 设置测试环境变量
 */

import { existsSync } from 'fs';
import { join } from 'path';

export default async function globalSetup() {
  const cookiesPath = join(process.cwd(), 'cookies.json');
  
  // 验证 Cookie 文件存在（用于 E2E 测试）
  if (!existsSync(cookiesPath)) {
    console.warn('⚠️  Warning: cookies.json not found. E2E tests may fail.');
    console.warn('   Run "npm run login" first to authenticate.');
  } else {
    console.log('✓ Cookie file found for E2E tests');
  }

  // 设置测试环境变量
  process.env.TEST_MODE = 'true';
  process.env.DEBUG = process.env.DEBUG || 'false';
}
