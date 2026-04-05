/**
 * SMS login implementation
 *
 * @module login/sms
 * @description SMS authentication flow
 */

import type { BrowserInstance } from '../../core/browser/types';
import type { UserName } from '../../user';
import { SkillError, SkillErrorCode, urls, isPlatformUrl } from '../../config';
import { debugLog, delay, randomDelay, waitForCondition } from '../../core/utils';
import { humanClick, checkLoginStatus } from '../../core/anti-detect';
import type { LoginResult } from './types';

/**
 * Perform SMS login (interactive)
 */
export async function smsLogin(
  instance: BrowserInstance,
  timeout: number,
  user?: UserName
): Promise<LoginResult> {
  const { page } = instance;

  await page.goto(urls.login);
  await randomDelay(1000, 2000);

  const smsTabClicked = await humanClick(page, 'text=手机登录, text=短信登录, [class*="sms"]');
  if (!smsTabClicked) {
    throw new SkillError('Cannot find SMS login option', SkillErrorCode.LOGIN_FAILED);
  }

  await delay(1000);
  console.error('Please complete SMS login in the browser window.');

  await waitForCondition(
    async () => {
      if (page.isClosed()) {
        throw new SkillError(
          'Browser window closed by user. Login cancelled.',
          SkillErrorCode.LOGIN_FAILED
        );
      }

      const currentUrl = page.url();
      if (!currentUrl.includes('/login') && isPlatformUrl(currentUrl)) {
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

  debugLog('Login successful. Session will auto-persist to profile.');

  return {
    success: true,
    message: 'Login successful. Session persisted to profile.',
    cookieSaved: true,
    user,
  };
}
