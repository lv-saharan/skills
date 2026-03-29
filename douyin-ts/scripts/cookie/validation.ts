/**
 * Cookie validation operations
 *
 * @module cookie/validation
 * @description Validate cookies for authentication
 */

import type { CookieEntry } from './types';
import { DouyinError, DouyinErrorCode } from '../shared';

// ============================================
// Constants
// ============================================

/** Key cookies required for Douyin authentication */
const REQUIRED_COOKIES = ['sessionid'] as const;

/** Optional cookies for enhanced functionality */
const OPTIONAL_COOKIES = ['tt_scid', '__ac_signature'] as const;

// ============================================
// Validation Functions
// ============================================

/**
 * Check if required cookies are present
 */
export function hasRequiredCookies(cookies: CookieEntry[]): boolean {
  const cookieNames = new Set(cookies.map((c) => c.name));

  return REQUIRED_COOKIES.every((name) => cookieNames.has(name));
}

/**
 * Get specific cookie by name
 */
export function getCookie(cookies: CookieEntry[], name: string): CookieEntry | undefined {
  return cookies.find((c) => c.name === name);
}

/**
 * Validate cookies and throw error if invalid
 */
export function validateCookies(cookies: CookieEntry[]): void | never {
  if (!cookies.length) {
    throw new DouyinError('No cookies found. Please login first.', DouyinErrorCode.NOT_LOGGED_IN);
  }

  if (!hasRequiredCookies(cookies)) {
    throw new DouyinError(
      'Required cookies missing. Please login again.',
      DouyinErrorCode.COOKIE_EXPIRED
    );
  }
}