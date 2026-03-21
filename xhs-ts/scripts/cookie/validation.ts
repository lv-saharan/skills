/**
 * Cookie validation operations
 *
 * @module cookie/validation
 * @description Validate cookies for authentication
 */

import type { CookieEntry } from './types';
import { XhsError, XhsErrorCode } from '../shared';

// ============================================
// Constants
// ============================================

/** Key cookies required for authentication */
const REQUIRED_COOKIES = ['a1', 'web_session'] as const;

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
    throw new XhsError('No cookies found. Please login first.', XhsErrorCode.NOT_LOGGED_IN);
  }

  if (!hasRequiredCookies(cookies)) {
    throw new XhsError(
      'Required cookies missing. Please login again.',
      XhsErrorCode.COOKIE_EXPIRED
    );
  }
}
