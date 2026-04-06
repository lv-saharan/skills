/**
 * Session Management - Unified Authentication Entry
 *
 * @module actions/shared/session
 * @description Unified session orchestration for all Xiaohongshu actions.
 *              Provides browser lifecycle + authentication + navigation in a single API.
 *
 * This module is the SINGLE source of truth for session management.
 * All actions should use withSession or withAuthenticatedAction.
 */

import type { Page } from 'playwright';
import type { UserName } from '../../user';
import type { StealthBehaviorConfig, ProfileLaunchOptions } from './browser-launcher';
import { withProfile, randomStealthDelay } from './browser-launcher';
import { resolveUser } from '../../user';
import { SkillError, SkillErrorCode } from '../../config/errors';
import { timeouts, urls, delays } from '../../config/loader';
import { gaussianDelay, delay, debugLog, waitForCondition } from '../../core/utils';
import {
  checkCaptcha,
  checkLoginStatus,
  simulateReading,
  humanClick,
} from '../../core/anti-detect';
import {
  LOGIN_BUTTON_SELECTORS,
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  QR_CODE_SELECTORS,
  QR_TAB_SELECTOR,
} from './selectors';
import { writeFile } from 'fs/promises';
import { getTmpFilePath } from '../../core/utils';
import { outputQrCode } from '../../core/utils/output';

// ============================================
// Types
// ============================================

/**
 * Session context passed to callback
 */
export interface SessionContext {
  /** Playwright page instance */
  page: Page;
  /** Resolved user name */
  user: UserName;
  /** Stealth behavior configuration */
  behavior: StealthBehaviorConfig;
  /** CDP port (if using CDP mode) */
  cdpPort: number;
  /** Whether this is a new browser instance */
  isNewInstance: boolean;
}

/**
 * Options for withSession
 */
export interface SessionOptions {
  /** Run in headless mode */
  headless?: boolean;
  /** Auto-create user profile if not exists */
  autoCreate?: boolean;
  /** Skip login check (useful for public pages) */
  skipLogin?: boolean;
  /** Navigate to home page after launch (default: true) */
  navigateHome?: boolean;
}

/**
 * Simplified options for withAuthenticatedAction (backward compatible)
 */
export interface AuthenticatedActionOptions {
  /** Run in headless mode */
  headless?: boolean;
  /** Skip login check */
  skipLogin?: boolean;
}

// ============================================
// Auto-Login Types
// ============================================

/**
 * Options for ensureLogin
 */
export interface EnsureLoginOptions {
  user: UserName;
  timeout?: number;
}

/**
 * Result of ensureLogin operation
 */
export interface EnsureLoginResult {
  success: boolean;
  message?: string;
  qrPath?: string;
}

// ============================================
// Auto-Login Implementation
// ============================================

/**
 * Ensure user is logged in, auto-start login if needed
 *
 * @param page - Playwright page
 * @param options - Login options
 * @returns Login result
 */
export async function ensureLogin(
  page: Page,
  options: EnsureLoginOptions
): Promise<EnsureLoginResult> {
  const { user, timeout = timeouts.login } = options;

  // Use ensureLoginStatus to check login state
  const status = await ensureLoginStatus(page);

  if (status.isLoggedIn) {
    debugLog('User already logged in');
    return { success: true, message: 'Already logged in' };
  }

  // If there's an error (e.g., error page), return it
  if (status.error) {
    return { success: false, message: status.error };
  }

  // Try to trigger login modal if not already open
  // Headless mode supports this - QR code will be saved to file
  if (!status.loginModalOpen) {
    const triggeredStatus = await ensureLoginStatus(page, { forceTrigger: true });

    if (!triggeredStatus.loginModalOpen) {
      return {
        success: false,
        message: '无法触发登录弹窗。请手动打开小红书网站登录。',
      };
    }
  }

  // Proceed with QR code detection and wait for scan
  // Headless mode: QR code will be saved to file and output to agent
  // GUI mode: QR code visible in browser window
  return await waitForQrScan(page, { user, timeout });
}

/**
 * Wait for QR code scan and login completion
 */
async function waitForQrScan(
  page: Page,
  options: { user: UserName; timeout: number }
): Promise<EnsureLoginResult> {
  const { user, timeout } = options;

  try {
    // Step 1: Switch to QR code tab if needed
    debugLog('Looking for QR code tab...');
    const qrTab = page.locator(QR_TAB_SELECTOR).first();
    if (await qrTab.isVisible().catch(() => false)) {
      debugLog('Found QR code tab, clicking...');
      await qrTab.click();
      await delay(500);
    }

    // Step 2: Find and save QR code
    debugLog('Waiting for QR code...');
    let qrPath: string | undefined;

    for (const selector of QR_CODE_SELECTORS) {
      const qrElement = page.locator(selector).first();
      if (await qrElement.isVisible().catch(() => false)) {
        debugLog('QR code found: ' + selector);

        try {
          // Wait for element to be stable before screenshot
          await qrElement.waitFor({ state: 'visible', timeout: 5000 });
          await delay(500);

          const buffer = await qrElement.screenshot({ type: 'png', timeout: 10000 });
          qrPath = getTmpFilePath('qr_login', 'png', user);
          await writeFile(qrPath, buffer);
          debugLog('QR code saved to: ' + qrPath);

          // Output QR path for agent communication
          outputQrCode(qrPath, '请扫描二维码登录');
        } catch (error) {
          debugLog('Failed to save QR code:', error);
        }
        break;
      }
    }

    if (!qrPath) {
      debugLog('QR code not found, but modal is open. Waiting for scan...');
    }

    // Step 3: Wait for user to scan QR code
    debugLog('Waiting for user to scan QR code...');

    await waitForCondition(
      async () => {
        // Check for login success
        const loggedIn = await checkLoginStatus(page);
        if (loggedIn) {
          return true;
        }

        // Check for captcha
        const hasCaptcha = await checkCaptcha(page);
        if (hasCaptcha) {
          debugLog('Captcha detected during login');
        }

        return false;
      },
      {
        timeout,
        interval: 1000,
        timeoutMessage: 'Login timeout - QR code not scanned',
      }
    );

    debugLog('Login successful!');
    return { success: true, message: 'Login successful', qrPath };
  } catch (error) {
    debugLog('Login timeout or error:', error);
    return {
      success: false,
      message: 'Login timeout. Please try again.',
    };
  }
}

// ============================================
// Core Session API
// ============================================

/**
 * Execute an action with authenticated session
 *
 * This is the PRIMARY API for all Xiaohongshu actions.
 * Handles: browser launch -> navigate home -> ensure login -> execute callback
 *
 * @param user - User name (optional, defaults to current user)
 * @param callback - Action callback receiving SessionContext
 * @param options - Session options
 * @returns Callback result
 *
 * @example
 * ```typescript
 * await withSession(user, async (ctx) => {
 *   const { page, behavior } = ctx;
 *   await page.goto(url);
 *   // ... perform action
 * });
 * ```
 */
export async function withSession<T>(
  user: UserName | undefined,
  callback: (ctx: SessionContext) => Promise<T>,
  options: SessionOptions = {}
): Promise<T> {
  const { headless = false, autoCreate = true, skipLogin = false, navigateHome = true } = options;
  const resolvedUser = user ?? resolveUser();

  return withProfile(
    resolvedUser,
    async (page, profileResult) => {
      const { behavior, cdpPort, isNewInstance } = profileResult;

      // Step 1: Navigate to home page (loads persisted cookies)
      if (navigateHome) {
        await page.goto(urls.home, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
        // Wait for page to stabilize before checking login status (critical for headless mode)
        await page
          .waitForLoadState('networkidle', { timeout: timeouts.networkIdle })
          .catch(() => {});
        await randomStealthDelay(behavior, 'read');
      }

      // Step 2: Ensure login (auto-login if needed)
      if (!skipLogin) {
        const loginResult = await ensureLogin(page, {
          user: resolvedUser,
          timeout: timeouts.login,
        });

        if (!loginResult.success) {
          throw new SkillError(
            loginResult.message || 'Not logged in',
            SkillErrorCode.NOT_LOGGED_IN
          );
        }
      }

      // Step 3: Execute callback with session context
      return callback({
        page,
        user: resolvedUser,
        behavior,
        cdpPort,
        isNewInstance,
      });
    },
    { headless, autoCreate } as ProfileLaunchOptions
  );
}

/**
 * Execute an action with authenticated page (simplified API)
 *
 * This is a simplified version of withSession for backward compatibility.
 * Use this when you only need page and behavior.
 *
 * @param headless - Run in headless mode
 * @param user - User name (optional)
 * @param callback - Action callback receiving (page, behavior)
 * @param options - Additional options
 * @returns Callback result
 *
 * @example
 * ```typescript
 * await withAuthenticatedAction(headless, user, async (page, behavior) => {
 *   await page.goto(url);
 *   // ... perform action
 * });
 * ```
 */
export async function withAuthenticatedAction<T>(
  headless: boolean | undefined,
  user: UserName | undefined,
  callback: (page: Page, behavior: StealthBehaviorConfig) => Promise<T>,
  options?: AuthenticatedActionOptions
): Promise<T> {
  return withSession(
    user,
    async (ctx) => {
      return callback(ctx.page, ctx.behavior);
    },
    {
      headless: headless ?? options?.headless,
      skipLogin: options?.skipLogin,
      navigateHome: true,
    }
  );
}

// ============================================
// Page Utilities
// ============================================

/**
 * Navigate to URL with proper loading and delay
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
  await page.waitForLoadState('networkidle', { timeout: timeouts.networkIdle }).catch(() => {});
  await gaussianDelay(delays.afterNavigation);
}

/**
 * Check page health (login status, captcha, error messages)
 * @returns Error message if page has issues, null if healthy
 */
export async function checkPageHealth(page: Page): Promise<string | null> {
  // Check login status
  if (!(await checkLoginStatus(page))) {
    return '需要登录';
  }

  // Check captcha
  if (await checkCaptcha(page)) {
    return '检测到验证码';
  }

  // Check error messages
  const pageContent = await page.content();
  if (pageContent.includes('当前笔记暂时无法浏览') || pageContent.includes('页面不见了')) {
    return '页面不可访问';
  }
  if (pageContent.includes('用户不存在')) {
    return '用户不存在';
  }

  return null;
}

/**
 * Prepare page for action: navigate + check errors + simulate reading
 * @returns Error message if page has issues, null if ready
 */
export async function preparePageForAction(page: Page, url: string): Promise<string | null> {
  await navigateTo(page, url);

  const error = await checkPageHealth(page);
  if (error) {
    return error;
  }

  await simulateReading(page);
  return null;
}

// ============================================
// Batch Operations
// ============================================

/**
 * Options for batch execution
 */
export interface BatchOptions {
  /** Delay between items in ms */
  delayBetween?: number;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Execute batch operations with delays
 */
export async function executeBatch<T, R>(
  items: T[],
  processItem: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {}
): Promise<R[]> {
  const { onProgress } = options;
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = await processItem(items[i], i);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, items.length);
    }

    // Delay between items (not after last)
    if (i < items.length - 1) {
      if (options.delayBetween) {
        await gaussianDelay({
          mean: options.delayBetween,
          stdDev: options.delayBetween * 0.25,
        });
      } else {
        await gaussianDelay(delays.batchInterval);
      }
    }
  }

  return results;
}

// ============================================
// Human Simulation Utilities
// ============================================

/**
 * Wait for page to reach stable state
 */
export async function waitForStable(page: Page, options: { timeout?: number } = {}): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: options.timeout ?? 5000 });
  } catch {
    // Page didn't reach network idle, that's okay
  }
}

/**
 * Human-like scroll
 */
export async function humanScroll(
  page: Page,
  options: { direction?: 'down' | 'up'; distance?: number; speed?: 'slow' | 'normal' | 'fast' } = {}
): Promise<void> {
  const { direction = 'down', distance = 300, speed = 'normal' } = options;
  const scrollAmount = direction === 'down' ? distance : -distance;
  const steps = speed === 'slow' ? 5 : speed === 'fast' ? 2 : 3;

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, scrollAmount / steps);
    await delay(100 + Math.random() * 200);
  }
}

// ============================================
// Constants (re-export for convenience)
// ============================================

/** Interaction delay constants */
export const INTERACTION_DELAYS = delays;

// ============================================
// Platform-specific utilities (moved from config/session.ts)
// These are used by the auto-login flow
// ============================================

/**
 * Check for error page
 */
export async function checkErrorPage(
  page: Page
): Promise<{ isError: boolean; errorCode?: string; errorMsg?: string }> {
  try {
    const currentUrl = page.url();

    if (currentUrl.includes('/error') || currentUrl.includes('error_code')) {
      const urlObj = new URL(currentUrl);
      const errorCode = urlObj.searchParams.get('error_code') || undefined;
      const errorMsg = urlObj.searchParams.get('error_msg') || undefined;

      debugLog('Error page detected', { errorCode, errorMsg, url: currentUrl });
      return { isError: true, errorCode, errorMsg };
    }

    return { isError: false };
  } catch (error) {
    debugLog('Error checking error page:', error);
    return { isError: false };
  }
}

/**
 * Ensure login status is visible (trigger login modal if needed)
 * This is used by auto-login flow
 *
 * NOTE: Headless and GUI modes are handled identically - the only difference
 * is how the CDP browser instance is launched (see core/browser/launcher.ts).
 * Both modes can trigger login modal and capture QR code.
 */
export async function ensureLoginStatus(
  page: Page,
  options?: { timeout?: number; forceTrigger?: boolean }
): Promise<{ isLoggedIn: boolean; loginModalOpen?: boolean; triggered?: boolean; error?: string }> {
  const { forceTrigger = false } = options || {};

  try {
    // CRITICAL: Wait for page to stabilize BEFORE any checks
    // Waiting ensures login elements are fully rendered before detection
    await page.waitForLoadState('domcontentloaded', { timeout: timeouts.pageLoad }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: timeouts.networkIdle }).catch(() => {});
    await delay(1500); // Extra buffer for dynamic content (JS rendering)

    const currentUrl = page.url();
    debugLog('ensureLoginStatus: ' + currentUrl, { forceTrigger });

    // Check for error page
    const errorResult = await checkErrorPage(page);
    if (errorResult.isError) {
      debugLog('Error page detected');
      return {
        isLoggedIn: false,
        error: `错误页面: ${errorResult.errorMsg || errorResult.errorCode || '未知错误'}`,
      };
    }

    // Check if login modal is already open
    const loginModalVisible = await page
      .locator(LOGIN_MODAL_SELECTOR)
      .first()
      .isVisible({ timeout: timeouts.selector })
      .catch(() => false);

    if (loginModalVisible) {
      debugLog('.login-container found -> waiting for scan');
      return {
        isLoggedIn: false,
        loginModalOpen: true,
      };
    }

    // Check if user component is visible (logged in)
    const userComponentVisible = await page
      .locator(USER_COMPONENT_SELECTOR)
      .first()
      .isVisible({ timeout: timeouts.selector })
      .catch(() => false);

    if (userComponentVisible) {
      debugLog('.user.side-bar-component found -> logged in');
      return { isLoggedIn: true };
    }

    // URL-based login detection (works for both headless and GUI modes)
    // If redirected to /explore (not /login) without login modal, user is logged in
    const isOnExplorePage = currentUrl.includes('/explore');
    const isOnLoginPage = currentUrl.includes('/login');

    if (isOnExplorePage && !isOnLoginPage && !loginModalVisible) {
      debugLog('On /explore without login modal -> assuming logged in');
      return { isLoggedIn: true };
    }

    // Not logged in - try to trigger login modal if forceTrigger is true
    if (!forceTrigger) {
      debugLog('Not logged in and modal not open');
      return {
        isLoggedIn: false,
        loginModalOpen: false,
      };
    }

    debugLog('Auto-triggering login modal...');

    for (const selector of LOGIN_BUTTON_SELECTORS) {
      try {
        // Wait for button to be visible with longer timeout
        const button = page.locator(selector).first();
        await button.waitFor({ state: 'visible', timeout: timeouts.selector });
        debugLog(`Clicking login button: ${selector}`);

        const clicked = await humanClick(page, selector, { delayAfter: 2000 });

        if (clicked) {
          const modalAppeared = await page
            .locator(LOGIN_MODAL_SELECTOR)
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (modalAppeared) {
            debugLog('Login modal triggered successfully');
            return {
              isLoggedIn: false,
              loginModalOpen: true,
              triggered: true,
            };
          }
        }
      } catch {
        // Button not found, try next selector
        continue;
      }
    }

    // Fallback: navigate to /login page if login button not found
    debugLog('Login button not found, navigating to /login page...');
    await page.goto(urls.login, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
    await page.waitForLoadState('networkidle', { timeout: timeouts.networkIdle }).catch(() => {});
    await delay(1000);

    // Check if login modal appeared on /login page
    const loginModalOnLoginPage = await page
      .locator(LOGIN_MODAL_SELECTOR)
      .first()
      .isVisible({ timeout: timeouts.selector })
      .catch(() => false);

    if (loginModalOnLoginPage) {
      debugLog('Login modal visible on /login page');
      return {
        isLoggedIn: false,
        loginModalOpen: true,
        triggered: true,
      };
    }

    debugLog('Cannot trigger login modal');
    return {
      isLoggedIn: false,
      error: '无法触发登录弹窗',
    };
  } catch (error) {
    debugLog('Error ensuring login status:', error);
    return {
      isLoggedIn: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
