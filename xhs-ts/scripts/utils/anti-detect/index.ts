/**
 * Anti-detection utilities for browser automation
 *
 * @module utils/anti-detect
 * @description Tools to make automated browser behavior appear more human-like
 */

import type { Page, Locator } from 'playwright';
import { delay, randomDelay, debugLog } from '../helpers';

// Re-export advanced modules
export { humanMouseMoveBezier, humanMouseMoveToElement } from './mouse-trajectory';
export {
  humanScrollPhysics,
  humanScrollToPosition,
  humanScrollToBottom,
  humanScrollRead,
} from './scroll-physics';

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

/**
 * Human-like typing with Gaussian delay and occasional typos
 *
 * Features:
 * - Gaussian distribution for key delays (more realistic than uniform)
 * - Occasional typo simulation (mistype + backspace + correct)
 * - Variable key hold duration
 *
 * @param page - Playwright page
 * @param selector - Element selector
 * @param text - Text to type
 * @param options - Typing options
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  options: {
    /** Mean delay between keystrokes in ms (default: 50) */
    meanDelay?: number;
    /** Standard deviation for delay variation (default: 20) */
    stdDev?: number;
    /** Clear existing text before typing (default: false) */
    clear?: boolean;
    /** Typo probability (0-1, default: 0.02 for 2%) */
    typoRate?: number;
  } = {}
): Promise<boolean> {
  const { meanDelay = 50, stdDev = 20, clear = false, typoRate = 0.02 } = options;
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
    if (clear) {
      await element.fill('');
    }

    // Get nearby characters for typo simulation
    const getNearbyChar = (char: string): string => {
      const keyboard: Record<string, string[]> = {
        a: ['s', 'q', 'z'],
        s: ['a', 'd', 'w', 'x'],
        d: ['s', 'f', 'e', 'c'],
        f: ['d', 'g', 'r', 'v'],
        g: ['f', 'h', 't', 'b'],
        h: ['g', 'j', 'y', 'n'],
        j: ['h', 'k', 'u', 'm'],
        k: ['j', 'l', 'i'],
        l: ['k', 'o'],
        q: ['w', 'a'],
        w: ['q', 'e', 's'],
        e: ['w', 'r', 'd'],
        r: ['e', 't', 'f'],
        t: ['r', 'y', 'g'],
        y: ['t', 'u', 'h'],
        u: ['y', 'i', 'j'],
        i: ['u', 'o', 'k'],
        o: ['i', 'p', 'l'],
        p: ['o'],
        z: ['a', 'x'],
        x: ['z', 's', 'c'],
        c: ['x', 'd', 'v'],
        v: ['c', 'f', 'b'],
        b: ['v', 'g', 'n'],
        n: ['b', 'h', 'm'],
        m: ['n', 'j'],
      };
      const lower = char.toLowerCase();
      if (keyboard[lower] && Math.random() < 0.7) {
        const nearby = keyboard[lower];
        const wrong = nearby[Math.floor(Math.random() * nearby.length)];
        return char === lower ? wrong : wrong.toUpperCase();
      }
      // Random character from same row
      const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
      for (const row of rows) {
        const idx = row.indexOf(lower);
        if (idx >= 0) {
          const wrong = row[Math.floor(Math.random() * row.length)];
          return char === lower ? wrong : wrong.toUpperCase();
        }
      }
      return char;
    };

    // Gaussian delay helper
    const gaussianDelay = (mean: number, sd: number): number => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return Math.max(10, Math.floor(z0 * sd + mean));
    };

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Simulate occasional typo
      if (Math.random() < typoRate && /[a-zA-Z]/.test(char)) {
        // Type wrong character
        const wrongChar = getNearbyChar(char);
        await element.pressSequentially(wrongChar, { delay: gaussianDelay(meanDelay, stdDev) });

        // Pause (realize the mistake)
        await delay(100 + Math.random() * 150);

        // Delete wrong character
        await element.press('Backspace');
        await delay(80 + Math.random() * 100);

        // Type correct character
        await element.pressSequentially(char, { delay: gaussianDelay(meanDelay, stdDev) });
      } else {
        // Normal typing with Gaussian delay
        await element.pressSequentially(char, { delay: gaussianDelay(meanDelay, stdDev) });
      }

      // Occasional thinking pause (1% chance after spaces or punctuation)
      if ((char === ' ' || char === '.' || char === ',') && Math.random() < 0.01) {
        await delay(200 + Math.random() * 500);
      }
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
 * Check if page is an error page (IP risk, etc.)
 *
 * 错误页面特征：
 * - URL 包含 /error 或 error_code 参数
 * - 显示错误信息如 "IP存在风险"
 */
export async function checkErrorPage(
  page: Page
): Promise<{ isError: boolean; errorCode?: string; errorMsg?: string }> {
  try {
    const currentUrl = page.url();

    // 检测错误页面 URL
    if (currentUrl.includes('/error') || currentUrl.includes('error_code')) {
      // 尝试解析错误码和消息
      const urlObj = new URL(currentUrl);
      const errorCode = urlObj.searchParams.get('error_code') || undefined;
      const errorMsg = urlObj.searchParams.get('error_msg') || undefined;

      debugLog('Error page detected', { errorCode, errorMsg, url: currentUrl });
      return { isError: true, errorCode, errorMsg };
    }

    return { isError: false };
  } catch (error) {
    debugLog('Error checking error page:', error);
    return { isError: false };
  }
}

// ============================================
// Login Status Detection
// ============================================

/** Login modal container selector */
const LOGIN_MODAL_SELECTOR = '.login-container';

/** User component selector (logged in indicator) */
const USER_COMPONENT_SELECTOR = '.user.side-bar-component';

/** Login button selectors (to trigger login modal) */
const LOGIN_BUTTON_SELECTORS = ['button.login-btn', '.login-btn'] as const;

/**
 * Check if user is logged in (pure check, no side effects)
 *
 * 检测逻辑（按优先级）：
 * 1. 错误页面 → false
 * 2. .login-container 存在 → false（登录弹窗已打开）
 * 3. .user.side-bar-component 存在 → true（已登录）
 * 4. 都不存在 → false（可能需要触发登录）
 */
export async function checkLoginStatus(page: Page): Promise<boolean> {
  try {
    const currentUrl = page.url();
    debugLog('checkLoginStatus: ' + currentUrl);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle').catch(() => {});
    await delay(1500);

    // STEP 1: 检查错误页面
    const errorResult = await checkErrorPage(page);
    if (errorResult.isError) {
      debugLog('Error page detected → NOT logged in');
      return false;
    }

    // STEP 2: 检查登录弹窗是否已打开
    // .login-container 存在 = 弹窗已打开 = 未登录
    const loginModalVisible = await page
      .locator(LOGIN_MODAL_SELECTOR)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (loginModalVisible) {
      debugLog('.login-container found → NOT logged in (modal open)');
      return false;
    }

    // STEP 3: 检查用户组件是否存在
    // .user.side-bar-component 存在 = 已登录
    const userComponentVisible = await page
      .locator(USER_COMPONENT_SELECTOR)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (userComponentVisible) {
      debugLog('.user.side-bar-component found → IS logged in');
      return true;
    }

    // STEP 4: 都不存在 → 未登录
    debugLog('No login modal and no user component → NOT logged in');
    return false;
  } catch (error) {
    debugLog('Error checking login status:', error);
    return false;
  }
}

// ============================================
// Types for ensureLoginStatus
// ============================================

export interface EnsureLoginStatusResult {
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 登录弹窗是否已打开 */
  loginModalOpen?: boolean;
  /** 是否自动触发了登录弹窗 */
  triggered?: boolean;
  /** 错误信息 */
  error?: string;
}

// ============================================
// Ensure Login Status (check + trigger)
// ============================================

/**
 * Ensure login status, auto-trigger login modal if needed
 *
 * 检测逻辑（按优先级）：
 * 1. 错误页面 → 返回错误
 * 2. .login-container 存在 → 未登录，弹窗已打开
 * 3. .user.side-bar-component 存在 → 已登录
 * 4. 都不存在 + 登录按钮存在 → 自动触发登录弹窗
 * 5. 都不存在 + 登录按钮不存在 → 返回错误
 */
export async function ensureLoginStatus(
  page: Page,
  options?: { timeout?: number }
): Promise<EnsureLoginStatusResult> {
  try {
    const currentUrl = page.url();
    debugLog('ensureLoginStatus: ' + currentUrl);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle').catch(() => {});
    await delay(1500);

    // STEP 1: 检查错误页面
    const errorResult = await checkErrorPage(page);
    if (errorResult.isError) {
      debugLog('Error page detected');
      return {
        isLoggedIn: false,
        error: `错误页面: ${errorResult.errorMsg || errorResult.errorCode || '未知错误'}`,
      };
    }

    // STEP 2: 检查登录弹窗是否已打开
    const loginModalVisible = await page
      .locator(LOGIN_MODAL_SELECTOR)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (loginModalVisible) {
      debugLog('.login-container found → waiting for scan');
      return {
        isLoggedIn: false,
        loginModalOpen: true,
      };
    }

    // STEP 3: 检查用户组件是否存在
    const userComponentVisible = await page
      .locator(USER_COMPONENT_SELECTOR)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (userComponentVisible) {
      debugLog('.user.side-bar-component found → logged in');
      return { isLoggedIn: true };
    }

    // STEP 4: 都不存在，尝试自动触发登录弹窗
    debugLog('Auto-triggering login modal...');

    for (const selector of LOGIN_BUTTON_SELECTORS) {
      const buttonVisible = await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (buttonVisible) {
        debugLog(`Clicking login button: ${selector}`);

        const clicked = await humanClick(page, selector, { delayAfter: 2000 });

        if (clicked) {
          // 等待 .login-container 出现
          const modalAppeared = await page
            .locator(LOGIN_MODAL_SELECTOR)
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (modalAppeared) {
            debugLog('Login modal triggered successfully');
            return {
              isLoggedIn: false,
              loginModalOpen: true,
              triggered: true,
            };
          }
        }
      }
    }

    // STEP 5: 无法触发登录弹窗
    debugLog('Cannot trigger login modal');
    return {
      isLoggedIn: false,
      error: '无法触发登录弹窗',
    };
  } catch (error) {
    debugLog('Error ensuring login status:', error);
    return {
      isLoggedIn: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
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
