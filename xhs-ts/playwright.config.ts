import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 测试配置
 * 
 * 运行测试：
 * - npm run test           运行所有测试
 * - npm run test:ui        使用 UI 模式运行
 * - npm run test:debug     调试模式运行
 * - npm run test:headed    有头模式运行（显示浏览器）
 * - npm run test:report    查看测试报告
 */

export default defineConfig({
  // 测试目录
  testDir: './tests',

  // 超时设置
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  // 失败重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行 worker 数
  workers: process.env.CI ? 1 : undefined,

  // 报告器
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // 全局设置
  use: {
    browserName: 'chromium',
    headless: false, // 默认有头模式，便于调试
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    
    // 失败时自动截图
    screenshot: 'only-on-failure',
    
    // 失败时保留视频
    video: 'retain-on-failure',
    
    // 追踪选项
    trace: 'retain-on-failure',
    
    // 用户代理（模拟真实浏览器）
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },

  // 项目配置
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chromium'],
      },
    },
  ],

  // 输出目录
  outputDir: 'test-results/',

  // 全局设置文件
  globalSetup: require.resolve('./tests/global-setup'),
});
