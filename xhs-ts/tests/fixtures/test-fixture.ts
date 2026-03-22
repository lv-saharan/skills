import { test as base, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 测试夹具扩展
 * 
 * 提供：
 * - authenticatedPage: 已登录的页面实例
 * - testCookies: 测试专用的 Cookie 管理
 */

interface TestFixtures {
  authenticatedPage: Page;
  testCookies: Array<{ name: string; value: string; domain: string; path: string }>;
}

export const test = base.extend<TestFixtures>({
  // 加载测试 Cookie
  testCookies: async ({}, use) => {
    const cookiesPath = join(process.cwd(), 'cookies.json');
    let cookies: Array<{ name: string; value: string; domain: string; path: string }> = [];

    if (existsSync(cookiesPath)) {
      try {
        const data = JSON.parse(readFileSync(cookiesPath, 'utf-8'));
        cookies = data.cookies || [];
        console.log(`✓ Loaded ${cookies.length} cookies for testing`);
      } catch (error) {
        console.warn('⚠️  Failed to parse cookies.json');
      }
    }

    await use(cookies);
  },

  // 已登录的页面实例
  authenticatedPage: async ({ browser, testCookies }, use) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    // 添加 Cookie 到上下文
    if (testCookies.length > 0) {
      await context.addCookies(testCookies);
    }

    const page = await context.newPage();

    // 导航到主页验证登录状态
    await page.goto('https://www.xiaohongshu.com', { waitUntil: 'networkidle' });

    await use(page);

    await page.close();
    await context.close();
  },
});

export { expect };
