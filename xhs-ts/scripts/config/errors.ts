/**
 * Platform errors
 *
 * @module config/errors
 * @description Skill error definitions
 */

import { createPlatformError, type StandardErrorCode } from '../core/error';

/**
 * Skill error codes
 */
export const SkillErrorCode = {
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

export type SkillErrorCodeType = (typeof SkillErrorCode)[keyof typeof SkillErrorCode];

/**
 * Skill error class
 *
 * @example
 * `	ypescript
 * throw new SkillError('Login required', SkillErrorCode.NOT_LOGGED_IN);
 * throw new SkillError('Network failed', SkillErrorCode.NETWORK_ERROR, { originalError: err });
 * `
 */
export const SkillError = createPlatformError({
  name: 'SkillError',
  codes: SkillErrorCode,
});
