/**
 * Anti-detection utilities for browser automation
 *
 * @module core/anti-detect
 * @description Tools to make automated browser behavior appear more human-like (platform-agnostic)
 */

import type { Page, Locator } from 'playwright';
import { delay } from '../utils/delay';
import { debugLog } from '../utils/logging';

// ============================================
// Types
// ============================================

/**
 * Options for humanType function
 */
export interface HumanTypeOptions {
  /** Minimum delay between keystrokes in ms (default: 30) */
  minDelay?: number;
  /** Maximum delay between keystrokes in ms (default: 120) */
  maxDelay?: number;
  /** Chance of a thinking pause (0-1, default: 0.08) */
  thinkPauseChance?: number;
  /** Chance of making a typo and correcting it (0-1, default: 0.02) */
  typoChance?: number;
  /** Clear existing text before typing (default: true) */
  clearFirst?: boolean;
}

/**
 * Options for humanScroll function
 */
export interface HumanScrollOptions {
  /** Scroll direction (default: 'down') */
  direction?: 'down' | 'up';
  /** Total scroll distance in pixels (default: 300) */
  distance?: number;
  /** Use acceleration/deceleration curve (default: true) */
  withAcceleration?: boolean;
  /** Scroll speed preset (default: 'normal') - for backward compatibility */
  speed?: 'slow' | 'normal' | 'fast';
}

// ============================================
// Helper Functions
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
 * Check if character is ASCII (typo only for ASCII)
 */
function isAsciiChar(char: string): boolean {
  return char.charCodeAt(0) < 128;
}

/**
 * Generate a typo character (only for ASCII letters/numbers)
 */
function generateTypoChar(char: string): string | null {
  if (!isAsciiChar(char)) {
    return null;
  }

  const code = char.charCodeAt(0);

  // For lowercase letters
  if (code >= 97 && code <= 122) {
    const offset = Math.random() > 0.5 ? 1 : -1;
    const newCode = code + offset;
    if (newCode >= 97 && newCode <= 122) {
      return String.fromCharCode(newCode);
    }
  }

  // For uppercase letters
  if (code >= 65 && code <= 90) {
    const offset = Math.random() > 0.5 ? 1 : -1;
    const newCode = code + offset;
    if (newCode >= 65 && newCode <= 90) {
      return String.fromCharCode(newCode);
    }
  }

  // For numbers
  if (code >= 48 && code <= 57) {
    const offset = Math.random() > 0.5 ? 1 : -1;
    const newCode = code + offset;
    if (newCode >= 48 && newCode <= 57) {
      return String.fromCharCode(newCode);
    }
  }

  return null;
}

// ============================================
// Human-like Interactions
// ============================================

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
 * Human-like typing with realistic delays and occasional corrections
 *
 * Supports both ASCII and non-ASCII (Chinese, etc.) characters.
 * Typo simulation only applies to ASCII characters.
 *
 * @param locator - Playwright locator for the input element
 * @param text - Text to type
 * @param options - Typing behavior options
 */
export async function humanType(
  locator: Locator,
  text: string,
  options: HumanTypeOptions = {}
): Promise<void> {
  const {
    minDelay = 30,
    maxDelay = 120,
    thinkPauseChance = 0.08,
    typoChance = 0.02,
    clearFirst = true,
  } = options;

  try {
    // Focus the element
    await locator.focus();
    await delay(100 + Math.random() * 200);

    // Clear existing content if requested
    if (clearFirst) {
      await locator.fill('');
      await delay(150 + Math.random() * 150);
    }

    // Type each character with human-like delays
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Check if we should simulate a typo (only for ASCII)
      const shouldTypo = Math.random() < typoChance && i > 2 && i < text.length - 2;
      const typoChar = shouldTypo ? generateTypoChar(char) : null;

      if (typoChar) {
        // Type wrong character
        await locator.pressSequentially(typoChar, { delay: 50 + Math.random() * 100 });
        await delay(100 + Math.random() * 200);

        // Realize mistake and backspace
        await delay(200 + Math.random() * 300);
        await locator.press('Backspace');
        await delay(100 + Math.random() * 150);

        // Type correct character
        await locator.pressSequentially(char, { delay: 50 + Math.random() * 100 });
      } else {
        // Normal typing - use pressSequentially for proper character handling
        await locator.pressSequentially(char, { delay: 0 }); // We handle delay ourselves
      }

      // Occasional thinking pause
      if (Math.random() < thinkPauseChance) {
        await delay(300 + Math.random() * 700);
      }

      // Random delay between keystrokes
      await delay(minDelay + Math.random() * (maxDelay - minDelay));
    }

    // Small delay after completing typing
    await delay(100 + Math.random() * 200);
  } catch (error) {
    debugLog('humanType failed, falling back to fill:', error);
    // Fallback: use fill() which is more reliable but less human-like
    if (clearFirst) {
      await locator.fill(text);
    } else {
      const currentValue = await locator.inputValue().catch(() => '');
      await locator.fill(currentValue + text);
    }
  }
}

/**
 * Human-like scroll with acceleration and deceleration
 *
 * @param page - Playwright page
 * @param options - Scroll options
 */
export async function humanScroll(page: Page, options: HumanScrollOptions = {}): Promise<void> {
  const { direction = 'down', distance = 300, withAcceleration = true, speed = 'normal' } = options;
  const scrollAmount = direction === 'down' ? distance : -distance;

  // Determine steps based on speed (for backward compatibility)
  const steps = speed === 'slow' ? 6 : speed === 'fast' ? 3 : 5 + Math.floor(Math.random() * 2);

  for (let i = 0; i < steps; i++) {
    let amount: number;

    if (withAcceleration) {
      // Ease-in-out curve: start slow, accelerate, then decelerate
      const progress = i / (steps - 1);
      const easeProgress =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      amount = (scrollAmount * easeProgress) / steps;
    } else {
      amount = scrollAmount / steps;
    }

    await page.mouse.wheel(0, amount);
    await delay(80 + Math.random() * 120);
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
