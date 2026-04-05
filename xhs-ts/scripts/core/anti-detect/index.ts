/**
 * Anti-detection utilities for browser automation
 *
 * @module core/anti-detect
 * @description Tools to make automated browser behavior appear more human-like (platform-agnostic)
 */

import type { Page, Locator } from 'playwright';
import { delay } from '../utils/delay';
import { debugLog } from '../utils/logging';

// Re-export advanced modules
export { humanMouseMoveBezier, humanMouseMoveToElement } from './mouse-trajectory';
export {
  humanScrollPhysics,
  humanScrollToPosition,
  humanScrollToBottom,
  humanScrollRead,
} from './scroll-physics';

// ============================================
// Types
// ============================================

/**
 * Login selectors configuration (platform-specific)
 */
export interface LoginSelectors {
  /** Login modal container */
  modal: string;
  /** Login button(s) */
  button: string | string[];
  /** User component (logged in indicator) */
  userComponent: string;
  /** User avatar (optional, alternative logged in indicator) */
  avatar?: string | string[];
}

/**
 * Login status result
 */
export interface LoginStatus {
  isLoggedIn: boolean;
  loginModalOpen?: boolean;
  error?: string;
}

// ============================================
// Human-like Interactions
// ============================================

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

/**
 * Human-like mouse move
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
 * Human-like click
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
    await delay(delayBefore + Math.random() * 100);
    await page.mouse.move(point.x, point.y, { steps: 10 + Math.floor(Math.random() * 10) });
    await delay(50 + Math.random() * 100);
    await page.mouse.click(point.x, point.y);
    await delay(delayAfter + Math.random() * 200);
    return true;
  } catch (error) {
    debugLog('Human click failed: ' + selector, error);
    return false;
  }
}

/**
 * Human-like typing with Gaussian delay and occasional typos
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string,
  options: {
    meanDelay?: number;
    stdDev?: number;
    clear?: boolean;
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

    // Keyboard layout for typo simulation
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

    const gaussianDelay = (mean: number, sd: number): number => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return Math.max(10, Math.floor(z0 * sd + mean));
    };

    const getNearbyChar = (char: string): string => {
      const lower = char.toLowerCase();
      if (keyboard[lower] && Math.random() < 0.7) {
        const nearby = keyboard[lower];
        const wrong = nearby[Math.floor(Math.random() * nearby.length)];
        return char === lower ? wrong : wrong.toUpperCase();
      }
      return char;
    };

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (Math.random() < typoRate && /[a-zA-Z]/.test(char)) {
        const wrongChar = getNearbyChar(char);
        await element.pressSequentially(wrongChar, { delay: gaussianDelay(meanDelay, stdDev) });
        await delay(100 + Math.random() * 150);
        await element.press('Backspace');
        await delay(80 + Math.random() * 100);
        await element.pressSequentially(char, { delay: gaussianDelay(meanDelay, stdDev) });
      } else {
        await element.pressSequentially(char, { delay: gaussianDelay(meanDelay, stdDev) });
      }

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

/**
 * Basic human-like scroll
 */
export async function humanScroll(
  page: Page,
  options: { direction?: 'down' | 'up'; distance?: number; speed?: 'slow' | 'normal' | 'fast' } = {}
): Promise<void> {
  const { direction = 'down', distance = 300, speed = 'normal' } = options;
  const scrollAmount = direction === 'down' ? distance : -distance;
  const steps = speed === 'slow' ? 5 : speed === 'fast' ? 2 : 3;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, scrollAmount / steps);
    await delay(100 + Math.random() * 200);
  }
}

// ============================================
// Captcha Detection
// ============================================

/**
 * Check if captcha is present on page
 */
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

// ============================================
// Login Status Detection
// ============================================

/**
 * Check login status (platform-agnostic)
 *
 * @param page - Playwright page
 * @param selectors - Platform-specific login selectors (optional, uses common defaults)
 * @returns Whether user is logged in
 */
export async function checkLoginStatus(page: Page, selectors?: LoginSelectors): Promise<boolean> {
  try {
    // Use provided selectors or common defaults
    const userComponent = selectors?.userComponent ?? '.user.side-bar-component';
    const avatar = selectors?.avatar;
    const modal = selectors?.modal ?? '.login-container';

    const userSelectors = [
      userComponent,
      ...(avatar ? (Array.isArray(avatar) ? avatar : [avatar]) : []),
    ].join(', ');

    const userVisible = await page
      .locator(userSelectors)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (userVisible) {
      return true;
    }

    // Check login modal
    const modalVisible = await page
      .locator(modal)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    return !modalVisible;
  } catch (error) {
    debugLog('Error checking login status:', error);
    return false;
  }
}

/**
 * Simulate human-like reading behavior
 */
export async function simulateReading(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (viewport) {
    await page.mouse.move(
      Math.random() * viewport.width * 0.6 + viewport.width * 0.2,
      Math.random() * viewport.height * 0.6 + viewport.height * 0.2
    );
    await delay(100 + Math.random() * 200);
  }

  const images = await page.locator('img').all();
  if (images.length > 0) {
    const randomImg = images[Math.floor(Math.random() * Math.min(images.length, 5))];
    await randomImg.hover({ timeout: 2000 }).catch(() => {});
    await delay(500 + Math.random() * 1000);
  }

  if (Math.random() > 0.5) {
    await humanScroll(page, {
      direction: Math.random() > 0.5 ? 'down' : 'up',
      distance: 100 + Math.random() * 200,
    });
  }

  await delay(1000 + Math.random() * 2000);
}

/**
 * Wait for page to be stable
 */
export async function waitForStable(page: Page, options: { timeout?: number } = {}): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: options.timeout ?? 5000 });
  } catch {
    debugLog('Page did not reach network idle state');
  }
}
