/**
 * Cookie login implementation
 *
 * @module login/cookie
 * @description Parse cookie string and inject into browser context
 */

import type { BrowserContext } from 'playwright';
import type { BrowserInstance } from '../../core/browser/types';
import type { UserName } from '../../user';
import { SkillError, SkillErrorCode, urls } from '../../config';
import { debugLog, delay } from '../../core/utils';
import { isLoggedIn } from '../auth/status';
import type { LoginResult } from './types';

// ============================================
// Cookie Parsing
// ============================================

/**
 * Cookie from cookie string
 *
 * Supported format: "name1=value1; name2=value2; name3=value3"
 *
 * @param cookieString - Cookie string from browser DevTools
 * @returns Array of Playwright Cookie objects
 */
export function parseCookieString(cookieString: string): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
}> {
  if (!cookieString || cookieString.trim() === '') {
    throw new SkillError('Cookie string is empty', SkillErrorCode.LOGIN_FAILED);
  }

  const cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }> = [];

  // Split by semicolon
  const pairs = cookieString.split(';');

  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) {
      continue;
    }

    // Find first '=' to split name and value
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      debugLog('Skipping invalid cookie pair: ' + trimmed);
      continue;
    }

    const name = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    if (!name) {
      debugLog('Skipping cookie with empty name');
      continue;
    }

    cookies.push({
      name,
      value,
      domain: '.xiaohongshu.com',
      path: '/',
    });
  }

  if (cookies.length === 0) {
    throw new SkillError(
      'No valid cookies found in string. Format: "name1=value1; name2=value2"',
      SkillErrorCode.LOGIN_FAILED
    );
  }

  debugLog('Parsed ' + cookies.length + ' cookies from string');
  return cookies;
}

/**
 * Inject cookies into browser context
 *
 * @param context - Playwright browser context
 * @param cookies - Array of cookies to inject
 */
export async function injectCookies(
  context: BrowserContext,
  cookies: Array<{ name: string; value: string; domain: string; path: string }>
): Promise<void> {
  await context.addCookies(cookies);
  debugLog('Injected ' + cookies.length + ' cookies into context');
}

// ============================================
// Cookie Login Flow
// ============================================

/**
 * Perform cookie-based login
 *
 * Flow:
 * 1. Parse cookie string → Cookie[]
 * 2. Inject cookies into browser context
 * 3. Navigate to home page
 * 4. Verify login status
 * 5. Return result
 *
 * @param instance - Browser instance (page, context, browser)
 * @param cookieString - Cookie string in format "name1=value1; name2=value2"
 * @param user - User name for logging
 * @returns Login result
 */
export async function cookieLogin(
  instance: BrowserInstance,
  cookieString: string,
  user?: UserName
): Promise<LoginResult> {
  const { page, context } = instance;

  debugLog('Starting cookie login for user: ' + (user || 'default'));

  // Step 1: Parse cookie string
  const cookies = parseCookieString(cookieString);

  // Step 2: Inject cookies into context
  await injectCookies(context, cookies);

  // Step 3: Navigate to home page to apply cookies
  debugLog('Navigating to home page to verify cookies...');
  await page.goto(urls.home, { waitUntil: 'networkidle', timeout: 30000 });

  // Step 4: Wait a moment for page to settle
  await delay(1000);

  // Step 5: Verify login status
  const loggedIn = await isLoggedIn(page);

  if (!loggedIn) {
    debugLog('Cookie login failed - not logged in after injection');
    return {
      success: false,
      message:
        'Cookie登录失败。Cookie可能已过期或无效。请确保包含必要的认证Cookie（如web_session、a1等）。',
      user,
    };
  }

  debugLog('Cookie login successful');
  return {
    success: true,
    message: 'Cookie登录成功。Session已持久化到profile。',
    cookieSaved: true,
    user,
  };
}
