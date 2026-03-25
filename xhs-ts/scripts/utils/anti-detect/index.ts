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
  await page.mouse.move(targetX, targetY, { steps });
}

/**
 * Human-like click on element
 */
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
    const steps = 10 + Math.floor(Math.random() * 10);
    await page.mouse.move(point.x, point.y, { steps });
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
 * Human-like type text with random delays
 */
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
      await element.pressSequentially(char, {
        delay: typeDelay + Math.random() * 50,
      });
    }

    return true;
  } catch (error) {
    debugLog('Human type failed: ' + selector, error);
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
    debugLog('Page did not reach network idle state');
  }
}

// ============================================
// Session Management
// ============================================

/**
 * Check if user is logged in
 *
 * DETECTION STRATEGY (fail-safe):
 * 1. Check NEGATIVE indicators FIRST (login button, login modal)
 *    - If found -> definitely NOT logged in
 * 2. Check POSITIVE indicators (user avatar in header, publish button)
 *    - If found -> IS logged in
 * 3. Default to NOT logged in (safer)
 *
 * IMPORTANT: Use specific selectors, avoid broad patterns like [class*="avatar"]
 * which can match unrelated elements (ads, recommended authors, etc.)
 */
export async function checkLoginStatus(page: Page): Promise<boolean> {
  try {
    const currentUrl = page.url();

    // Wait for page to stabilize
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    // If still on login page, definitely not logged in
    if (currentUrl.includes('/login')) {
      debugLog('On login page, not logged in');
      return false;
    }

    // ============================================
    // STEP 1: Check NEGATIVE indicators FIRST
    // ============================================

    // Check for login button in header (strong indicator of NOT logged in)
    // Use header-specific selector to avoid false matches in content
    const loginButtonInHeader = page.locator(
      'header button:has-text("登录"), ' +
        'header a:has-text("登录"), ' +
        'header button:has-text("登录/注册"), ' +
        'header a:has-text("登录/注册"), ' +
        'nav button:has-text("登录"), ' +
        'nav a:has-text("登录")'
    );

    const hasLoginButton = await loginButtonInHeader
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasLoginButton) {
      debugLog('Found login button in header, user is NOT logged in');
      return false;
    }

    // Check for login modal (very strong indicator)
    const loginModalSelectors = [
      '.login-modal',
      '.red-login-modal',
      '.login-container',
      '[class*="LoginModal"]',
      '[class*="loginModal"]',
      '.qrcode-login',
    ];

    for (const selector of loginModalSelectors) {
      const hasModal = await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (hasModal) {
        debugLog('Found login modal, user is NOT logged in');
        return false;
      }
    }

    // ============================================
    // STEP 2: Check POSITIVE indicators
    // ============================================

    // Check for user avatar in header (SPECIFIC selectors only)
    // IMPORTANT: Avoid broad selectors like [class*="avatar"] or img[class*="avatar"]
    // which can match ads, recommended authors, etc.
    const headerAvatarSelectors = [
      'header .user-avatar',
      'header .avatar-wrapper',
      'header [class*="userAvatar"]',
      'header [class*="UserAvatar"]',
      'nav .user-avatar',
      'nav .avatar-wrapper',
      '.side-nav .user-avatar',
      '.side-nav .avatar-wrapper',
    ];

    for (const selector of headerAvatarSelectors) {
      const hasAvatar = await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (hasAvatar) {
        debugLog('Found user avatar in header, user IS logged in');
        return true;
      }
    }

    // Check for publish/create button (only visible when logged in)
    const publishButton = page.locator(
      'button:has-text("发布"), ' +
        'a:has-text("发布"), ' +
        '[class*="publish-btn"], ' +
        '[class*="PublishBtn"]'
    );

    const hasPublishButton = await publishButton
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (hasPublishButton) {
      debugLog('Found publish button, user IS logged in');
      return true;
    }

    // Check for user profile link in header
    const userProfileLink = page.locator(
      'header a[href*="/user/profile/"], ' +
        'nav a[href*="/user/profile/"], ' +
        'header a[href*="/user/"]'
    );

    const hasProfileLink = await userProfileLink
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (hasProfileLink) {
      debugLog('Found user profile link, user IS logged in');
      return true;
    }

    // ============================================
    // STEP 3: Default to NOT logged in
    // ============================================
    debugLog('No clear login indicators found, defaulting to NOT logged in');
    return false;
  } catch (error) {
    debugLog('Error checking login status:', error);
    return false;
  }
}
