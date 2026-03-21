/**
 * CLI output types
 *
 * @module utils/output/types
 * @description Type definitions for CLI output formatting
 */

import type { XhsErrorCodeType } from '../../shared';

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
  code: XhsErrorCodeType;
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
