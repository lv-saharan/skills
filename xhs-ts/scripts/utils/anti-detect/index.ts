/**
 * Anti-detection utilities for browser automation
 *
 * @module utils/anti-detect
 * @description Tools to make automated browser behavior appear more human-like
 */

import type { Page, Locator } from 'playwright';
import { delay, randomDelay, debugLog } from '../helpers';

async function getRandomPointInElement(element: Locator): Promise<{ x: number; y: number } | null> {
  const box = await element.boundingBox();
  if (!box) {
    return null;
  }
  const padding = 5;
  return {
    x: box.x + padding + Math.random() * (box.width - padding * 2),
    y: box.y + padding + Math.random() * (box.height - padding * 2),
  };
}

export async function humanMouseMove(
  page: Page,
  targetX: number,
  targetY: number,
  options: { steps?: number } = {}
): Promise<void> {
  const { steps = 10 + Math.floor(Math.random() * 10) } = options;
  await page.mouse.move(targetX, targetY, { steps });
}

export async function humanClick(
  page: Page,
  selector: string,
  options: { delayBefore?: number; delayAfter?: number } = {}
): Promise<boolean> {
  const { delayBefore = 100, delayAfter = 200 } = options;
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
    const point = await getRandomPointInElement(element);
    if (!point) {
      debugLog('Element has no bounding box: ' + selector);
      return false;
    }
    await randomDelay(delayBefore, delayBefore + 100);
    await page.mouse.move(point.x, point.y, { steps: 10 + Math.floor(Math.random() * 10) });
    await delay(50 + Math.random() * 100);
    await page.mouse.click(point.x, point.y);
    await randomDelay(delayAfter, delayAfter + 200);
    return true;
  } catch (error) {
    debugLog('Human click failed: ' + selector, error);
    return false;
  }
}

export async function humanType(
  page: Page,
  selector: string,
  text: string,
  options: { delay?: number; clear?: boolean } = {}
): Promise<boolean> {
  const { delay: typeDelay = 50, clear = false } = options;
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
    if (clear) {
      await element.fill('');
    }
    for (const char of text) {
      await element.pressSequentially(char, { delay: typeDelay + Math.random() * 50 });
    }
    return true;
  } catch (error) {
    debugLog('Human type failed: ' + selector, error);
    return false;
  }
}

export async function humanScroll(
  page: Page,
  options: { direction?: 'down' | 'up'; distance?: number; speed?: 'slow' | 'normal' | 'fast' } = {}
): Promise<void> {
  const { direction = 'down', distance = 300, speed = 'normal' } = options;
  const scrollAmount = direction === 'down' ? distance : -distance;
  const steps = speed === 'slow' ? 5 : speed === 'fast' ? 2 : 3;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, scrollAmount / steps);
    await randomDelay(100, 300);
  }
}

export async function checkCaptcha(page: Page): Promise<boolean> {
  const selectors = [
    '.captcha-container',
    '#captcha',
    '[class*="captcha"]',
    'iframe[src*="captcha"]',
  ];
  for (const selector of selectors) {
    if (
      await page
        .locator(selector)
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
  }
  return false;
}

export async function waitForStable(page: Page, options: { timeout?: number } = {}): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: options.timeout ?? 5000 });
  } catch {
    debugLog('Page did not reach network idle state');
  }
}

/**
 * Check if user is logged in
 *
 * TWO CORE RULES:
 * 1. 登录框/登录按钮在吗？ → 在 = 未登录 (return false)
 * 2. 头像出来了吗？ → 在 = 已登录 (return true)
 */
export async function checkLoginStatus(page: Page): Promise<boolean> {
  try {
    const currentUrl = page.url();
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    // RULE 1: Login button/modal visible? → NOT logged in
    // Use specific selectors, no timeout (immediate check)
    const loginButtonSelectors = [
      'header button:has-text("登录")',
      'header a:has-text("登录")',
      'header button:has-text("登录/注册")',
      'nav button:has-text("登录")',
    ];
    for (const sel of loginButtonSelectors) {
      if (
        await page
          .locator(sel)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        debugLog('Login button found → NOT logged in');
        return false;
      }
    }

    // Check for login modal (specific selectors only, no timeout)
    const loginModalSelectors = ['.login-modal', '.red-login-modal', '.login-container'];
    for (const sel of loginModalSelectors) {
      if (
        await page
          .locator(sel)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        debugLog('Login modal found → NOT logged in');
        return false;
      }
    }

    // RULE 2: User avatar in header visible? → IS logged in
    const avatarSelectors = [
      'header .user-avatar',
      'header .avatar-wrapper',
      'header [class*="userAvatar"]',
      'nav .user-avatar',
      '.side-nav .avatar-wrapper',
    ];
    for (const sel of avatarSelectors) {
      if (
        await page
          .locator(sel)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        debugLog('User avatar found → IS logged in');
        return true;
      }
    }

    // FALLBACK: Check publish button (only visible when logged in)
    if (
      await page
        .locator('button:has-text("发布")')
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      debugLog('Publish button found → IS logged in');
      return true;
    }

    // FALLBACK: URL-based check
    // If on home/explore/user profile page without login modal/button, likely logged in
    // NOTE: User profile pages (/user/profile/) don't have standard header elements,
    // so we rely on URL pattern + absence of login indicators
    if (
      currentUrl.includes('xiaohongshu.com') &&
      (currentUrl.includes('/explore') ||
        currentUrl.includes('/home') ||
        currentUrl.includes('/user/profile/') ||
        currentUrl === 'https://www.xiaohongshu.com/')
    ) {
      debugLog('On home/explore/user page without login indicators → IS logged in');
      return true;
    }

    debugLog('No login indicators found → NOT logged in');
    return false;
  } catch (error) {
    debugLog('Error checking login status:', error);
    return false;
  }
}

/**
 * Simulate human-like reading behavior
 *
 * Combines multiple atomic operations (mouse move, hover, scroll, delay)
 * to simulate a user reading content on the page.
 */
export async function simulateReading(page: Page): Promise<void> {
  // 1. 随机移动鼠标到内容区域
  const viewport = page.viewportSize();
  if (viewport) {
    await page.mouse.move(
      Math.random() * viewport.width * 0.6 + viewport.width * 0.2,
      Math.random() * viewport.height * 0.6 + viewport.height * 0.2
    );
    await delay(100 + Math.random() * 200);
  }

  // 2. 随机悬停在图片上
  const images = await page.locator('img').all();
  if (images.length > 0) {
    const randomImg = images[Math.floor(Math.random() * Math.min(images.length, 5))];
    await randomImg.hover({ timeout: 2000 }).catch(() => {});
    await delay(500 + Math.random() * 1000);
  }

  // 3. 偶尔滚动一下
  if (Math.random() > 0.5) {
    await humanScroll(page, {
      direction: Math.random() > 0.5 ? 'down' : 'up',
      distance: 100 + Math.random() * 200,
    });
  }

  // 4. 随机阅读时间
  await delay(1000 + Math.random() * 2000);
  debugLog('模拟浏览完成');
}
