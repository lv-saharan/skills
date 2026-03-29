/**
 * Session verification utilities
 *
 * @module login/verify
 * @description Verify existing session/cookies for Douyin
 */

import type { BrowserInstance } from '../browser';
import type { UserName } from '../user';
import { createBrowserInstance, closeBrowserInstance } from '../browser';
import { loadCookies, hasRequiredCookies } from '../cookie';
import { DY_URLS } from '../config';
import { debugLog, delay } from '../utils/helpers';
import { checkLoginStatus } from '../utils/anti-detect';

/**
 * Verify if existing cookies represent a valid session
 *
 * @param user - User name (optional)
 * @returns true if valid session exists, false otherwise
 */
export async function verifyExistingSession(user?: UserName): Promise<boolean> {
  debugLog(`Checking if already logged in for user: ${user || 'default'}...`);

  const cookies = await loadCookies(user);
  if (!hasRequiredCookies(cookies)) {
    debugLog('No valid cookies found (missing required cookies)');
    return false;
  }

  debugLog('Found existing cookies, verifying login status...');

  let verifyInstance: BrowserInstance | null = null;
  try {
    verifyInstance = await createBrowserInstance({ headless: true });
    await verifyInstance.context.addCookies(cookies);
    
    // 使用 domcontentloaded 而不是 networkidle（抖音网站有大量实时连接）
    await verifyInstance.page.goto(DY_URLS.home, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // 等待页面渲染
    await delay(5000);

    // 检查登录状态
    const isLoggedIn = await checkLoginStatus(verifyInstance.page);
    debugLog(`checkLoginStatus result: ${isLoggedIn}`);

    if (isLoggedIn) {
      debugLog('Already logged in! Cookies are valid.');
      return true;
    }

    debugLog('Cookies exist but session invalid');
    return false;
  } catch (verifyError) {
    debugLog('Cookie verification failed:', verifyError);
    return false;
  } finally {
    if (verifyInstance) {
      await closeBrowserInstance(verifyInstance);
    }
  }
}