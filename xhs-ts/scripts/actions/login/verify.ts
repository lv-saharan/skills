/**
 * Session verification utilities
 *
 * @module login/verify
 * @description Verify existing session/cookies using Profile API
 */

import type { UserName } from '../../user';
import { hasProfile } from '../../user/storage';
import { withProfile } from '../shared/browser-launcher';
import { urls, config } from '../../config';
import { debugLog } from '../../core/utils';
import { checkLoginStatus } from '../../core/anti-detect';

/**
 * Verify if existing cookies represent a valid session using Profile API
 *
 * In Profile mode, cookies are automatically persisted to the user data directory.
 * This function launches a profile browser to verify the session.
 * Supports CDP mode for browser instance reuse.
 *
 * @param user - User name (optional)
 * @param headless - Run in headless mode (optional, defaults to config.headless)
 * @returns true if valid session exists, false otherwise
 */
export async function verifyExistingSession(user?: UserName, headless?: boolean): Promise<boolean> {
  const actualHeadless = headless ?? config.headless;
  debugLog(
    `Checking if already logged in for user: ${user || 'default'}... (headless: ${actualHeadless})`
  );

  // Check if profile exists first (new users don't have profile)
  if (!hasProfile(user || 'default')) {
    debugLog('Profile does not exist, user needs to login');
    return false;
  }

  // Use withProfile to support both CDP and Persistent Context modes
  try {
    const result = await withProfile(
      user || 'default',
      async (page) => {
        // Navigate to home page with persisted cookies
        await page.goto(urls.home, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        // Check login status
        const isLoggedIn = await checkLoginStatus(page);
        debugLog(`checkLoginStatus result: ${isLoggedIn}`);

        return isLoggedIn;
      },
      { headless: actualHeadless }
    );

    if (result) {
      debugLog('Already logged in! Session is valid.');
      return true;
    }

    debugLog('Session invalid (not logged in)');
    return false;
  } catch (verifyError) {
    debugLog('Session verification failed:', verifyError);
    return false;
  }
}
