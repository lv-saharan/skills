/**
 * Authentication check utilities for publish flow
 *
 * @module publish/auth-check
 * @description Handle login detection and auto-login during publish
 */

import type { Page, BrowserContext } from 'playwright';
import type { BrowserInstance } from '../browser';
import { XhsError, XhsErrorCode } from '../shared';
import { loadCookies, saveCookies } from '../cookie';
import { XHS_URLS, debugLog, delay, waitForCondition } from '../utils/helpers';
import { checkLoginStatus } from '../utils/anti-detect';
import { TIMEOUTS } from '../shared';

// ============================================
// Main Site Login Check
// ============================================

/**
 * Check login status and auto-trigger login if needed
 *
 * @returns true if login successful or already logged in
 */
export async function ensureMainSiteLogin(instance: BrowserInstance): Promise<boolean> {
  const isLoggedIn = await checkLoginStatus(instance.page);
  debugLog(`Login status on main site: ${isLoggedIn}`);

  if (isLoggedIn) {
    debugLog('User is logged in on main site');
    return true;
  }

  // Output structured status for agent integration
  const loginRequiredOutput = {
    type: 'login_required',
    status: 'waiting_action',
    autoLoginAvailable: true,
    message: '检测到未登录状态，需要登录后才能发布笔记',
    nextStep: 'executeAutoLogin',
  };
  console.log('\n⚠️  检测到未登录状态');
  console.log('📋 下一步：自动触发登录流程');
  console.log(JSON.stringify(loginRequiredOutput));

  // Auto-trigger login flow
  debugLog('Auto-triggering login flow...');
  const { executeLogin } = await import('../login');

  try {
    await executeLogin({ method: 'qr', creator: false });

    // Reload cookies into browser context
    debugLog('Reloading cookies into current browser context...');
    const newCookies = await loadCookies();
    await instance.context.addCookies(newCookies);
    debugLog(`Loaded ${newCookies.length} new cookies into browser context`);

    // Refresh page to apply new session
    debugLog('Refreshing page to apply new session...');
    await instance.page.goto(XHS_URLS.home, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUTS.PAGE_LOAD,
    });
    await delay(2000);

    // Re-check login status
    const reloginCheck = await checkLoginStatus(instance.page);
    debugLog(`Re-check login status: ${reloginCheck}`);

    if (!reloginCheck) {
      throw new XhsError('登录失败，请检查账号状态', XhsErrorCode.LOGIN_FAILED);
    }

    debugLog('Auto-login successful');

    // Output success status
    const loginSuccessOutput = {
      type: 'login_success',
      status: 'continuing',
      message: '登录成功，继续发布流程',
      nextStep: 'navigate_to_publish_page',
    };
    console.log('\n✅ 登录成功');
    console.log(JSON.stringify(loginSuccessOutput));

    return true;
  } catch (loginError) {
    const loginErrorOutput = {
      type: 'login_error',
      status: 'failed',
      errorCode: loginError instanceof Error ? loginError.name : 'UNKNOWN',
      message: loginError instanceof Error ? loginError.message : String(loginError),
    };
    console.log('\n❌ 登录失败');
    console.log(JSON.stringify(loginErrorOutput));
    throw loginError;
  }
}

// ============================================
// Creator Center Login Check
// ============================================

/**
 * Wait for creator center login completion
 */
export async function waitForCreatorCenterLogin(
  page: Page,
  context: BrowserContext,
  timeout = 120000
): Promise<boolean> {
  console.log('\n⚠️  需要登录创作者中心');
  console.log('📱 请在浏览器窗口中登录（扫码或短信验证）');
  console.log('   登录成功后将自动继续...\n');

  try {
    await waitForCondition(
      async () => {
        const url = page.url();
        return url.includes('creator.xiaohongshu.com') && !url.includes('login');
      },
      {
        timeout,
        interval: 2000,
        timeoutMessage: 'Creator center login timeout',
        onProgress: (elapsed) => {
          if (elapsed % 10 === 0) {
            debugLog(`[${elapsed}s] Waiting for creator center login...`);
          }
        },
      }
    );

    console.log('✅ 创作者中心登录成功！\n');
    const newCookies = await context.cookies();
    await saveCookies(newCookies);
    debugLog('Saved creator center cookies');
    return true;
  } catch {
    throw new XhsError('Creator center login timeout', XhsErrorCode.NOT_LOGGED_IN);
  }
}
