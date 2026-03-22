/**
 * Shared error types
 *
 * @module shared/errors
 * @description Global error definitions used across all modules
 */

// ============================================
// Error Codes
// ============================================

/** Standard error codes for CLI output */
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
} as const;

export type XhsErrorCodeType = (typeof XhsErrorCode)[keyof typeof XhsErrorCode];

// ============================================
// Error Class
// ============================================

/**
 * Custom error class with error code
 *
 * @example
 * ```typescript
 * throw new XhsError('Login required', XhsErrorCode.NOT_LOGGED_IN);
 * throw new XhsError('Network failed', XhsErrorCode.NETWORK_ERROR, { originalError: err });
 * ```
 */
export class XhsError extends Error {
  constructor(
    message: string,
    public readonly code: XhsErrorCodeType,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'XhsError';
  }
}
