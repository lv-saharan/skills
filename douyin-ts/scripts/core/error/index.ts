/**
 * Error module entry
 *
 * @module core/error
 * @description Platform-agnostic error framework with Douyin-specific error class
 */

import { createPlatformError, type StandardErrorCode } from './types';

// ============================================
// Douyin Error Codes
// ============================================

/**
 * Douyin error codes
 */
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
// Douyin Error Class
// ============================================

/**
 * Douyin-specific error class
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

// ============================================
// Re-exports
// ============================================

export type { StandardErrorCode, PlatformErrorConfig } from './types';
export { PlatformError, createPlatformError } from './types';
