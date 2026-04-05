/**
 * Session verification utilities
 *
 * @module login/verify
 * @description Verify existing session/cookies using Profile API
 */

import type { UserName } from '../user';
import { hasProfile } from '../user/storage';
import { withProfile } from '../browser';
import { XHS_URLS, debugLog, delay } from '../utils/helpers';
import { checkLoginStatus } from '../utils/anti-detect';

/**
 * Verify if existing cookies represent a valid session using Profile API
 *
 * In Profile mode, cookies are automatically persisted to the user data directory.
 * This function launches a profile browser to verify the session.
 * Supports CDP mode for browser instance reuse.
 *
 * @param user - User name (optional)
 * @returns true if valid session exists, false otherwise
 */
export async function verifyExistingSession(user?: UserName): Promise<boolean> {
  debugLog(`Checking if already logged in for user: ${user || 'default'}...`);

  // Check if profile exists first (new users don't have profile)
  if (!hasProfile(user || 'default')) {
    debugLog('Profile does not exist, user needs to login');
    return false;
  }

  // Use withProfile to support both CDP and Persistent Context modes
  // CRITICAL: Use config.headless instead of forcing headless=true
  // Forcing headless mode triggers anti-bot detection on Xiaohongshu
  try {
    const result = await withProfile(
      user || 'default',
      async (page) => {
        // Navigate to home page with persisted cookies
        await page.goto(XHS_URLS.home, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        // Check login status
        const isLoggedIn = await checkLoginStatus(page);
        debugLog(`checkLoginStatus result: ${isLoggedIn}`);

        return isLoggedIn;
      },
      { headless: false } // Use visible browser to avoid detection
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
