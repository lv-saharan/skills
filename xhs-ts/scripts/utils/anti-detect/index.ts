/**
 * Anti-detection utilities for browser automation
 *
 * @module utils/anti-detect
 * @description Tools to make automated browser behavior appear more human-like
 */

import type { Page, Locator } from 'playwright';
import { delay, randomDelay, debugLog } from '../helpers';

// ============================================
// Mouse Movement
// ============================================

/**
 * Get random point within element bounds
 */
async function getRandomPointInElement(element: Locator): Promise<{ x: number; y: number } | null> {
  const box = await element.boundingBox();
  if (!box) {
    return null;
  }

  // Add small padding to avoid clicking on edges
  const padding = 5;
  const x = box.x + padding + Math.random() * (box.width - padding * 2);
  const y = box.y + padding + Math.random() * (box.height - padding * 2);

  return { x, y };
}

/**
 * Human-like mouse movement with randomized path
 */
export async function humanMouseMove(
  page: Page,
  targetX: number,
  targetY: number,
  options: { steps?: number } = {}
): Promise<void> {
  const { steps = 10 + Math.floor(Math.random() * 10) } = options;

  // Move with randomized steps
  await page.mouse.move(targetX, targetY, { steps });
}

/**
 * Human-like click on element
 */
export async function humanClick(
  page: Page,
  selector: string,
  options: {
    delayBefore?: number;
    delayAfter?: number;
  } = {}
): Promise<boolean> {
  const { delayBefore = 100, delayAfter = 200 } = options;

  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });

    const point = await getRandomPointInElement(element);
    if (!point) {
      debugLog(`Element has no bounding box: ${selector}`);
      return false;
    }

    // Random delay before action
    await randomDelay(delayBefore, delayBefore + 100);

    // Move to element with random steps
    const steps = 10 + Math.floor(Math.random() * 10);
    await page.mouse.move(point.x, point.y, { steps });

    // Small delay before click
    await delay(50 + Math.random() * 100);

    // Click
    await page.mouse.click(point.x, point.y);

    // Random delay after action
    await randomDelay(delayAfter, delayAfter + 200);

    return true;
  } catch (error) {
    debugLog(`Human click failed: ${selector}`, error);
    return false;
  }
}

/**
 * Human-like type text with random delays
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  options: {
    delay?: number;
    clear?: boolean;
  } = {}
): Promise<boolean> {
  const { delay: typeDelay = 50, clear = false } = options;

  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });

    if (clear) {
      await element.fill('');
    }

    // Type with random variation in timing
    for (const char of text) {
      await element.pressSequentially(char, {
        delay: typeDelay + Math.random() * 50,
      });
    }

    return true;
  } catch (error) {
    debugLog(`Human type failed: ${selector}`, error);
    return false;
  }
}

// ============================================
// Scrolling
// ============================================

/**
 * Human-like scrolling
 */
export async function humanScroll(
  page: Page,
  options: {
    direction?: 'down' | 'up';
    distance?: number;
    speed?: 'slow' | 'normal' | 'fast';
  } = {}
): Promise<void> {
  const { direction = 'down', distance = 300, speed = 'normal' } = options;

  const scrollAmount = direction === 'down' ? distance : -distance;
  const steps = speed === 'slow' ? 5 : speed === 'fast' ? 2 : 3;
  const stepSize = scrollAmount / steps;

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepSize);
    await randomDelay(100, 300);
  }
}

// ============================================
// Detection Checks
// ============================================

/**
 * Check for CAPTCHA presence
 */
export async function checkCaptcha(page: Page): Promise<boolean> {
  const captchaSelectors = [
    '.captcha-container',
    '#captcha',
    '[class*="captcha"]',
    'iframe[src*="captcha"]',
  ];

  for (const selector of captchaSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible().catch(() => false)) {
      return true;
    }
  }

  return false;
}

/**
 * Wait for page to stabilize (no network activity)
 */
export async function waitForStable(page: Page, options: { timeout?: number } = {}): Promise<void> {
  const { timeout = 5000 } = options;

  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Network idle timeout is acceptable
    debugLog('Page did not reach network idle state');
  }
}

// ============================================
// Session Management
// ============================================

/**
 * Check if user is logged in
 * Uses multiple indicators for reliable detection
 */
export async function checkLoginStatus(page: Page): Promise<boolean> {
  try {
    const currentUrl = page.url();

    // Wait for page to stabilize
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    // If still on login page, definitely not logged in
    if (currentUrl.includes('/login')) {
      return false;
    }

    // Check for login modal/popup (strong indicator of not logged in)
    const loginModalSelectors = [
      '[class*="login"]',
      '[class*="qrcode"]',
      '[class*="QRCode"]',
      '[data-testid="login"]',
      '.login-modal',
      '.red-login-modal',
    ];

    for (const selector of loginModalSelectors) {
      const hasLoginModal = await page
        .locator(selector)
        .isVisible()
        .catch(() => false);
      if (hasLoginModal) {
        return false; // Login popup visible = not logged in
      }
    }

    // Check for login button in header (not on login page)
    const loginButtons = ['登录', '立即登录', '登录/注册'];
    for (const text of loginButtons) {
      const hasLoginButton = await page
        .locator(`button:has-text("${text}"), a:has-text("${text}")`)
        .isVisible()
        .catch(() => false);
      if (hasLoginButton) {
        return false; // Login button visible = not logged in
      }
    }

    // Check for user-specific elements that only appear when logged in
    const userAvatar = page.locator(
      '.user-avatar, [class*="avatar"], .avatar-wrapper, [data-testid="user-avatar"]'
    );
    const hasAvatar = await userAvatar.isVisible().catch(() => false);

    if (hasAvatar) {
      return true;
    }

    // Check for publish button (only visible when logged in)
    const publishButton = page.locator(
      'button:has-text("发布"), [class*="publish"], [data-testid="publish"]'
    );
    const hasPublish = await publishButton.isVisible().catch(() => false);

    if (hasPublish) {
      return true;
    }

    // If on home/explore page without login modal, likely logged in
    if (
      currentUrl.includes('xiaohongshu.com') &&
      (currentUrl === 'https://www.xiaohongshu.com/' ||
        currentUrl.includes('/explore') ||
        currentUrl.includes('/home'))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
