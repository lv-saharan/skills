/**
 * Session verification utilities
 *
 * @module login/verify
 * @description Verify existing session/cookies
 */

import type { BrowserInstance } from '../browser';
import { createBrowserInstance, closeBrowserInstance } from '../browser';
import { loadCookies, hasRequiredCookies } from '../cookie';
import { XHS_URLS, debugLog, delay } from '../utils/helpers';
import { checkLoginStatus } from '../utils/anti-detect';

/**
 * Verify if existing cookies represent a valid session
 *
 * @returns true if valid session exists, false otherwise
 */
export async function verifyExistingSession(): Promise<boolean> {
  debugLog('Checking if already logged in...');

  try {
    const cookies = await loadCookies();
    if (!hasRequiredCookies(cookies)) {
      debugLog('No valid cookies found');
      return false;
    }

    debugLog('Found existing cookies, verifying login status...');

    let verifyInstance: BrowserInstance | null = null;
    try {
      verifyInstance = await createBrowserInstance({ headless: true });
      await verifyInstance.context.addCookies(cookies);
      await verifyInstance.page.goto(XHS_URLS.home, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await delay(2000);

      const isLoggedIn = await checkLoginStatus(verifyInstance.page);
      if (isLoggedIn) {
        debugLog('Already logged in! Cookies are valid.');
        return true;
      }

      debugLog('Cookies exist but login status invalid');
      return false;
    } catch (verifyError) {
      debugLog('Cookie verification failed:', verifyError);
      return false;
    } finally {
      if (verifyInstance) {
        await closeBrowserInstance(verifyInstance);
      }
    }
  } catch {
    debugLog('No valid cookies found');
    return false;
  }
}
