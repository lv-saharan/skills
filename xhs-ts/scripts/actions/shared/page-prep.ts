/**
 * Page Preparation - Unified API
 *
 * @module actions/shared/page-prep
 * @description SINGLE source of truth for page preparation across all actions.
 *              Provides navigation, health checking, and auto-login.
 */

import type { Page } from 'playwright';
import type { UserName } from '../../user';
import { timeouts, delays } from '../../config/loader';
import { checkCaptcha, simulateReading } from '../../core/anti-detect';
import { isLoggedIn } from '../auth/status';
import { checkErrorPage } from '../auth/check-error';
import { autoLogin } from './auto-login';
import { gaussianDelay, debugLog } from '../../core/utils';

// ============================================
// Types
// ============================================

/**
 * Error types for page health issues
 */
export type PageErrorType =
  | 'NOT_LOGGED_IN'
  | 'CAPTCHA'
  | 'ERROR_PAGE'
  | 'CONTENT_ERROR'
  | 'AUTO_LOGIN_FAILED';

/**
 * Detailed page health status
 */
export interface PageHealthStatus {
  /** Whether page is healthy (no errors) */
  isHealthy: boolean;
  /** Whether user is logged in */
  isLoggedIn: boolean;
  /** Whether captcha is present */
  hasCaptcha: boolean;
  /** Whether page has error */
  hasError: boolean;
  /** Error message */
  errorMessage?: string;
  /** Error type classification */
  errorType?: PageErrorType;
}

/**
 * Result of preparePageForAction
 */
export interface PreparePageResult {
  /** Whether preparation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Error type if failed */
  errorType?: PageErrorType;
  /** Whether auto-login was performed */
  didAutoLogin?: boolean;
}

/**
 * Options for preparePageForAction
 */
export interface PreparePageOptions {
  /** Skip login check (useful for public pages) */
  skipLogin?: boolean;
  /** Auto-login timeout in milliseconds */
  timeout?: number;
  /** Whether to simulate reading after navigation */
  simulateReading?: boolean;
}

// ============================================
// Navigation
// ============================================

/**
 * Navigate to URL with proper loading and delay
 *
 * @param page - Playwright page
 * @param url - Target URL
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
  // Safe to ignore - page may never reach network idle if still loading dynamic content
  await page.waitForLoadState('networkidle', { timeout: timeouts.networkIdle }).catch(() => {});
  await gaussianDelay(delays.afterNavigation);
}

// ============================================
// Page Health Check
// ============================================

/**
 * Check page health with detailed status
 *
 * This function checks:
 * 1. Login status
 * 2. Captcha presence
 * 3. Error page (URL-based)
 * 4. Content errors (page content-based)
 *
 * @param page - Playwright page
 * @returns Detailed health status
 */
export async function checkPageHealth(page: Page): Promise<PageHealthStatus> {
  // Check login status
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    return {
      isHealthy: false,
      isLoggedIn: false,
      hasCaptcha: false,
      hasError: true,
      errorMessage: '需要登录',
      errorType: 'NOT_LOGGED_IN',
    };
  }

  // Check captcha
  const hasCaptcha = await checkCaptcha(page);
  if (hasCaptcha) {
    return {
      isHealthy: false,
      isLoggedIn: true,
      hasCaptcha: true,
      hasError: true,
      errorMessage: '检测到验证码',
      errorType: 'CAPTCHA',
    };
  }

  // Check error page (URL-based)
  const errorResult = await checkErrorPage(page);
  if (errorResult.isError) {
    return {
      isHealthy: false,
      isLoggedIn: true,
      hasCaptcha: false,
      hasError: true,
      errorMessage: errorResult.errorMsg || errorResult.errorCode || '未知错误',
      errorType: 'ERROR_PAGE',
    };
  }

  // Check content errors (page content-based)
  const pageContent = await page.content();

  // Note-specific error messages
  if (pageContent.includes('当前笔记暂时无法浏览') || pageContent.includes('页面不见了')) {
    return {
      isHealthy: false,
      isLoggedIn: true,
      hasCaptcha: false,
      hasError: true,
      errorMessage: '页面不可访问',
      errorType: 'CONTENT_ERROR',
    };
  }
  if (pageContent.includes('用户不存在')) {
    return {
      isHealthy: false,
      isLoggedIn: true,
      hasCaptcha: false,
      hasError: true,
      errorMessage: '用户不存在',
      errorType: 'CONTENT_ERROR',
    };
  }
  if (pageContent.includes('内容不存在')) {
    return {
      isHealthy: false,
      isLoggedIn: true,
      hasCaptcha: false,
      hasError: true,
      errorMessage: '内容不存在',
      errorType: 'CONTENT_ERROR',
    };
  }
  if (pageContent.includes('该内容因违规无法查看')) {
    return {
      isHealthy: false,
      isLoggedIn: true,
      hasCaptcha: false,
      hasError: true,
      errorMessage: '内容因违规无法查看',
      errorType: 'CONTENT_ERROR',
    };
  }

  return {
    isHealthy: true,
    isLoggedIn: true,
    hasCaptcha: false,
    hasError: false,
  };
}

/**
 * Check for content-specific errors in page
 *
 * This function checks for error messages in page content
 * that indicate the requested resource is unavailable.
 *
 * @param page - Playwright page
 * @param context - Context for better error messages ('note', 'user', 'general')
 * @returns Error message if found, null otherwise
 */
export async function checkContentErrors(
  page: Page,
  context: 'note' | 'user' | 'general' = 'general'
): Promise<string | null> {
  const content = await page.content();

  // Generic error messages (apply to all contexts)
  if (content.includes('当前笔记暂时无法浏览') || content.includes('页面不见了')) {
    return context === 'note' ? '笔记不可访问' : '页面不可访问';
  }
  if (content.includes('用户不存在')) {
    return '用户不存在';
  }
  if (content.includes('内容不存在')) {
    return context === 'note' ? '笔记不存在' : '内容不存在';
  }
  if (content.includes('该内容因违规无法查看')) {
    return context === 'note' ? '笔记因违规无法查看' : '内容因违规无法查看';
  }

  return null;
}

// ============================================
// Unified Page Preparation API
// ============================================

/**
 * Prepare page for action with unified error handling and auto-login
 *
 * This is the PRIMARY API for all action modules to prepare pages.
 * Handles: navigation → health check → auto-login (if needed) → simulate reading
 *
 * @param page - Playwright page
 * @param url - Target URL
 * @param user - User name (required for auto-login)
 * @param options - Preparation options
 * @returns Preparation result
 *
 * @example
 * ```typescript
 * // Basic usage
 * const prep = await preparePageForAction(page, url, user);
 * if (!prep.success) {
 *   return { error: prep.error };
 * }
 *
 * // Skip login check for public pages
 * const prep = await preparePageForAction(page, url, user, { skipLogin: true });
 *
 * // Custom timeout for auto-login
 * const prep = await preparePageForAction(page, url, user, { timeout: 60000 });
 * ```
 */
export async function preparePageForAction(
  page: Page,
  url: string,
  user: UserName,
  options: PreparePageOptions = {}
): Promise<PreparePageResult> {
  const {
    skipLogin = false,
    timeout = timeouts.login,
    simulateReading: doSimulateReading = true,
  } = options;

  // Step 1: Navigate to URL
  debugLog('Navigating to: ' + url);
  await navigateTo(page, url);

  // Step 2: Check page health
  const health = await checkPageHealth(page);

  // Step 3: Handle login error with auto-login
  if (!health.isHealthy && health.errorType === 'NOT_LOGGED_IN' && !skipLogin) {
    debugLog('检测到未登录，尝试自动登录...');

    const loginResult = await autoLogin(page, { user, timeout });

    if (!loginResult.success) {
      return {
        success: false,
        error: loginResult.message || '自动登录失败',
        errorType: 'AUTO_LOGIN_FAILED',
        didAutoLogin: false,
      };
    }

    debugLog('自动登录成功，重新导航...');

    // Re-navigate after login (cookies may have changed)
    await navigateTo(page, url);

    // Re-check health
    const recheckHealth = await checkPageHealth(page);
    if (!recheckHealth.isHealthy) {
      return {
        success: false,
        error: recheckHealth.errorMessage,
        errorType: recheckHealth.errorType,
        didAutoLogin: true,
      };
    }

    // Success after auto-login
    if (doSimulateReading) {
      await simulateReading(page);
    }
    return {
      success: true,
      didAutoLogin: true,
    };
  }

  // Step 4: Return other errors (captcha, error page, content error, etc.)
  if (!health.isHealthy) {
    return {
      success: false,
      error: health.errorMessage,
      errorType: health.errorType,
    };
  }

  // Step 5: Healthy page - simulate reading if requested
  if (doSimulateReading) {
    await simulateReading(page);
  }
  return { success: true };
}
