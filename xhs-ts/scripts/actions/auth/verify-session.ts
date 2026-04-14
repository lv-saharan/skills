/**
 * Session Verification
 *
 * @module auth/verify-session
 * @description Verify existing session/cookies validity
 */

import type { UserName } from '../../user';
import { hasProfile } from '../../user/storage';
import { withProfile } from '../shared/browser-launcher';
import { urls, config } from '../../config';
import { debugLog } from '../../core/utils';
import { isLoggedIn } from '../auth/status';

export async function verifySession(user?: UserName, headless?: boolean): Promise<boolean> {
  const actualHeadless = headless ?? config.headless;
  debugLog(
    'Checking session validity for user: ' +
      (user || 'default') +
      '... (headless: ' +
      actualHeadless +
      ')'
  );

  if (!hasProfile(user || 'default')) {
    debugLog('Profile does not exist, user needs to login');
    return false;
  }

  try {
    const result = await withProfile(
      user || 'default',
      async (page) => {
        await page.goto(urls.home, { waitUntil: 'networkidle', timeout: 30000 });
        const loggedIn = await isLoggedIn(page);
        debugLog('isLoggedIn result: ' + loggedIn);
        return loggedIn;
      },
      { headless: actualHeadless }
    );

    if (result) {
      debugLog('Session is valid.');
      return true;
    }

    debugLog('Session invalid (not logged in)');
    return false;
  } catch (verifyError) {
    debugLog('Session verification failed:', verifyError);
    return false;
  }
}
