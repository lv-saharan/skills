/**
 * Session verification utilities
 *
 * @module login/verify
 * @description Verify existing session/cookies using Profile API
 */

import type { UserName } from '../user';
import { hasProfile } from '../user/storage';
import { launchProfileBrowser } from '../browser';
import { XHS_URLS, debugLog, delay } from '../utils/helpers';
import { checkLoginStatus } from '../utils/anti-detect';

/**
 * Verify if existing cookies represent a valid session using Profile API
 *
 * In Profile mode, cookies are automatically persisted to the user data directory.
 * This function launches a temporary profile browser to verify the session.
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

  // Use Profile API to verify session
  // The profile browser will automatically load persisted cookies
  let browser = null;
  try {
    const result = await launchProfileBrowser({
      user,
      headless: true,
    });
    browser = result.browser;

    debugLog('Profile browser launched for verification');

    // Navigate to home page with persisted cookies
    await result.page.goto(XHS_URLS.home, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for page to fully render
    await delay(3000);

    // Check login status using TWO CORE RULES:
    // 1. Login button/modal visible? → NOT logged in
    // 2. User avatar visible? → IS logged in
    const isLoggedIn = await checkLoginStatus(result.page);
    debugLog(`checkLoginStatus result: ${isLoggedIn}`);

    if (isLoggedIn) {
      debugLog('Already logged in! Session is valid.');
      return true;
    }

    debugLog('Session invalid (not logged in)');
    return false;
  } catch (verifyError) {
    debugLog('Session verification failed:', verifyError);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
