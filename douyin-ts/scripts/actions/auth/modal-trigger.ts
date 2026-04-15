/**
 * Login Modal Trigger
 *
 * @module auth/modal-trigger
 * @description Trigger the login modal UI by clicking login buttons or navigating to login page.
 *
 * This module handles the ACTION of triggering login UI, separate from status detection.
 */

import type { Page } from 'playwright';
import { timeouts, urls } from '../../config';
import { delay, debugLog } from '../../core/utils';
import { humanClick } from '../../core/anti-detect';
import { LOGIN_BUTTON_SELECTORS, LOGIN_MODAL_SELECTOR } from '../shared/selectors';

/**
 * Result of attempting to trigger the login modal
 */
export interface TriggerModalResult {
  /** Whether the modal was successfully triggered */
  success: boolean;
  /** Whether modal is now visible */
  modalVisible: boolean;
  /** Error message if trigger failed */
  error?: string;
}

/**
 * Attempt to trigger the login modal.
 *
 * Strategy:
 * 1. Click login buttons (ordered by specificity)
 * 2. Fallback: navigate to /login page
 *
 * @param page - Playwright page
 * @returns Trigger result
 */
export async function triggerLoginModal(page: Page): Promise<TriggerModalResult> {
  debugLog('Triggering login modal...');

  // Try clicking login buttons
  for (const selector of LOGIN_BUTTON_SELECTORS) {
    try {
      const button = page.locator(selector).first();
      await button.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);

      if (await button.isVisible().catch(() => false)) {
        debugLog('Clicking login button: ' + selector);
        const clicked = await humanClick(page, selector, { delayAfter: 2000 });

        if (clicked) {
          const modalVisible = await page
            .locator(LOGIN_MODAL_SELECTOR)
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (modalVisible) {
            debugLog('Login modal triggered successfully');
            return { success: true, modalVisible: true };
          }
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback: navigate to login page
  debugLog('Login button not found, navigating to login page...');
  await page.goto(urls.login, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
  await delay(1500);

  const modalVisible = await page
    .locator(LOGIN_MODAL_SELECTOR)
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (modalVisible) {
    debugLog('Login modal visible on login page');
    return { success: true, modalVisible: true };
  }

  debugLog('Failed to trigger login modal');
  return { success: false, modalVisible: false, error: '无法触发登录弹窗' };
}
