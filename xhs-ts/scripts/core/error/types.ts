/**
 * Error types and factory
 *
 * @module core/error/types
 * @description Platform-agnostic error framework
 */

/**
 * Standard error codes that all platforms should implement
 */
export interface StandardErrorCode {
  NOT_LOGGED_IN: string;
  RATE_LIMITED: string;
  NOT_FOUND: string;
  NETWORK_ERROR: string;
  CAPTCHA_REQUIRED: string;
  COOKIE_EXPIRED: string;
  LOGIN_FAILED: string;
  BROWSER_ERROR: string;
  VALIDATION_ERROR: string;
  INTERNAL_ERROR: string;
  [key: string]: string; // Allow platform-specific extensions
}

/**
 * Platform error configuration
 */
export interface PlatformErrorConfig<T extends StandardErrorCode> {
  /** Platform name (e.g., 'xiaohongshu', 'douyin') */
  name: string;
  /** Error codes for this platform */
  codes: T;
}

/**
 * Platform-agnostic error base class
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

/**
 * Create a platform-specific error class
 *
 * @example
 * ```typescript
 * const XhsErrorCode = {
 *   NOT_LOGGED_IN: 'NOT_LOGGED_IN',
 *   // ...
 * } as const;
 *
 * export const XhsError = createPlatformError({
 *   name: 'XhsError',
 *   codes: XhsErrorCode,
 * });
 *
 * // Usage
 * throw new XhsError('Login required', XhsErrorCode.NOT_LOGGED_IN);
 * ```
 */
export function createPlatformError<T extends StandardErrorCode>(
  config: PlatformErrorConfig<T>
): typeof PlatformError {
  return class extends PlatformError {
    static readonly codes = config.codes;

    constructor(message: string, code: T[keyof T], details?: unknown) {
      super(message, code, details);
      this.name = config.name;
    }
  };
}
