import type { Page, Locator } from '@playwright/test';

/**
 * 测试辅助函数
 * 
 * 提供常用的测试工具函数，用于：
 * - 页面等待
 * - 随机延迟（模拟真实用户行为）
 * - 元素交互
 */

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * 固定延迟（不推荐，优先使用显式等待）
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 随机延迟（模拟真实用户行为）
 * @param min 最小毫秒数
 * @param max 最大毫秒数
 */
export async function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await delay(ms);
}

/**
 * 等待元素可见并返回
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<Locator> {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

/**
 * 模拟真实点击（带随机延迟）
 */
export async function humanClick(locator: Locator): Promise<void> {
  await randomDelay(200, 500);
  await locator.click();
}

/**
 * 模拟真实输入（带逐字延迟）
 */
export async function humanType(locator: Locator, text: string): Promise<void> {
  await locator.clear();
  for (const char of text) {
    await locator.pressSequentially(char, { delay: 50 + Math.random() * 50 });
  }
}

/**
 * 截图辅助函数（用于调试）
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}
