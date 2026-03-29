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
export const DouyinErrorCode = {
  NOT_LOGGED_IN: 'NOT_LOGGED_IN',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
  COOKIE_EXPIRED: 'COOKIE_EXPIRED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  BROWSER_ERROR: 'BROWSER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const;

export type DouyinErrorCodeType = (typeof DouyinErrorCode)[keyof typeof DouyinErrorCode];

// ============================================
// Error Class
// ============================================

/**
 * Custom error class with error code
 *
 * @example
 * ```typescript
 * throw new DouyinError('Login required', DouyinErrorCode.NOT_LOGGED_IN);
 * throw new DouyinError('Network failed', DouyinErrorCode.NETWORK_ERROR, { originalError: err });
 * ```
 */
export class DouyinError extends Error {
  constructor(
    message: string,
    public readonly code: DouyinErrorCodeType,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DouyinError';
  }
}
