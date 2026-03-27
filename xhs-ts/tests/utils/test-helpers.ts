/**
 * Test helper utilities
 *
 * @module tests/utils/test-helpers
 * @description Helper functions for E2E tests
 */

import type { Page } from '@playwright/test';

// ============================================
// Page Helpers
// ============================================

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Random delay to simulate human behavior
 */
export async function randomDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Simulate human-like click with random delays
 */
export async function humanClick(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
    await randomDelay(100, 300);
    await element.click();
    await randomDelay(200, 500);
    return true;
  } catch {
    return false;
  }
}

/**
 * Simulate human-like typing with random delays
 */
export async function humanType(page: Page, selector: string, text: string): Promise<boolean> {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
    await randomDelay(100, 200);
    await element.fill(text);
    await randomDelay(100, 300);
    return true;
  } catch {
    return false;
  }
}