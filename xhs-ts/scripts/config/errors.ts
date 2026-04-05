/**
 * Platform errors
 *
 * @module config/errors
 * @description Xiaohongshu error definitions
 */

import { createPlatformError, type StandardErrorCode } from '../core/error';

/**
 * Xiaohongshu error codes
 */
export const XhsErrorCode = {
  NOT_LOGGED_IN: 'NOT_LOGGED_IN',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
  COOKIE_EXPIRED: 'COOKIE_EXPIRED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  BROWSER_ERROR: 'BROWSER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PUBLISH_FAILED: 'PUBLISH_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const satisfies StandardErrorCode;

export type XhsErrorCodeType = (typeof XhsErrorCode)[keyof typeof XhsErrorCode];

/**
 * Xiaohongshu error class
 *
 * @example
 * ```typescript
 * throw new XhsError('Login required', XhsErrorCode.NOT_LOGGED_IN);
 * throw new XhsError('Network failed', XhsErrorCode.NETWORK_ERROR, { originalError: err });
 * ```
 */
export const XhsError = createPlatformError({
  name: 'XhsError',
  codes: XhsErrorCode,
});
