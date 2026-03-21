/**
 * SMS login implementation
 *
 * @module login/sms
 * @description SMS authentication flow
 */

import type { BrowserInstance } from '../browser';
import { XhsError, XhsErrorCode } from '../shared';
import { saveCookies, extractCookies } from '../cookie';
import { XHS_URLS, debugLog, delay, randomDelay, waitForCondition } from '../utils/helpers';
import { humanClick, checkLoginStatus } from '../utils/anti-detect';
import type { LoginResult } from './types';

/**
 * Perform SMS login (interactive)
 */
export async function smsLogin(
  instance: BrowserInstance,
  timeout: number,
  browserClosedRef: { closed: boolean }
): Promise<LoginResult> {
  const { page } = instance;

  await page.goto(XHS_URLS.login);
  await randomDelay(1000, 2000);

  // Click SMS tab
  const smsTabClicked = await humanClick(page, 'text=手机登录, text=短信登录, [class*="sms"]');
  if (!smsTabClicked) {
    throw new XhsError('Cannot find SMS login option', XhsErrorCode.LOGIN_FAILED);
  }

  await delay(1000);
  console.error('Please complete SMS login in the browser window.');

  // Wait for login completion
  await waitForCondition(
    async () => {
      // Check if browser was closed
      if (browserClosedRef?.closed) {
        throw new XhsError(
          'Browser window closed by user. Login cancelled.',
          XhsErrorCode.LOGIN_FAILED
        );
      }

      // Check if redirected from login page
      const currentUrl = page.url();
      if (!currentUrl.includes('/login') && currentUrl.includes('xiaohongshu.com')) {
        debugLog('Redirected from login page, checking login status...');
        await delay(2000);

        const isLoggedIn = await checkLoginStatus(page);
        if (isLoggedIn) {
          debugLog('Login successful via SMS');
          return true;
        }
      }

      return false;
    },
    {
      timeout,
      interval: 1000,
      timeoutMessage: 'SMS login timeout. Please try again.',
      onProgress: (elapsed) => debugLog(`[${elapsed}s] Waiting for SMS login...`),
    }
  );

  // Save cookies
  const cookies = await extractCookies(instance.context);
  await saveCookies(cookies);

  return {
    success: true,
    message: 'Login successful. Cookies saved.',
    cookieSaved: true,
  };
}
