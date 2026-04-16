/**
 * CLI output types
 *
 * @module core/utils/output/types
 * @description Type definitions for CLI output formatting (platform-agnostic)
 */

// ============================================
// Success Response
// ============================================

/**
 * Standard success response
 *
 * @template T - Type of the data payload
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  /** Optional message for agent to relay to user */
  toAgent?: string;
}

// ============================================
// Error Response
// ============================================

/**
 * Standard error response
 */
export interface ErrorResponse {
  error: true;
  message: string;
  code: string;
  details?: unknown;
  /** Optional message for agent to relay to user */
  toAgent?: string;
}

// ============================================
// Union Types
// ============================================

/** Union type for CLI output */
export type CliOutput<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ============================================
// QR Code Output
// ============================================

/**
 * QR code output for headless login
 */
export interface QrCodeOutput {
  type: 'qr_login';
  status: 'waiting_scan';
  /** Absolute path to QR code image file */
  qrPath: string;
  /** Optional message for agent to relay to user */
  toAgent?: string;
  message: string;
}

// ============================================
// Captcha Output
// ============================================

/**
 * Captcha output for headless mode
 */
export interface CaptchaOutput {
  type: 'captcha_required';
  status: 'waiting_completion';
  /** Absolute path to captcha screenshot image file */
  captchaPath: string;
  /** Optional message for agent to relay to user */
  toAgent?: string;
  message: string;
}
