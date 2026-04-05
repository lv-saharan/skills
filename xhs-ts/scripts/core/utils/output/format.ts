/**
 * Output formatting utilities
 *
 * @module core/utils/output/format
 * @description Standardized JSON output formatting for all CLI commands (platform-agnostic)
 */

import type { SuccessResponse, ErrorResponse, CliOutput, QrCodeOutput } from './types';

/**
 * Output success response as JSON to stdout
 */
export function outputSuccess<T>(data: T, toAgent?: string): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    toAgent,
  };
  console.log(JSON.stringify(response, null, 2));
}

/**
 * Output QR code for headless mode (consumed by OpenClaw)
 *
 * @param qrPath - Absolute path to QR code image
 * @param message - Platform-specific message to display
 */
export function outputQrCode(qrPath: string, message = '请扫描二维码登录'): void {
  const response: QrCodeOutput = {
    type: 'qr_login',
    status: 'waiting_scan',
    qrPath,
    toAgent: 'DISPLAY_IMAGE:qrPath:WAIT:扫码',
    message,
  };
  console.log(JSON.stringify(response, null, 2));
}

/**
 * Output error response as JSON to stderr
 */
export function outputError(message: string, code: string, details?: unknown): void {
  const response: ErrorResponse = {
    error: true,
    message,
    code,
    ...(details !== undefined && { details }),
  };
  console.error(JSON.stringify(response, null, 2));
}

/**
 * Output CLI response to appropriate stream
 */
export function output<T>(result: CliOutput<T>): void {
  if ('success' in result) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(JSON.stringify(result, null, 2));
  }
}

/**
 * Output error from Error instance
 *
 * Automatically extracts code if error has a 'code' property.
 */
export function outputFromError(error: unknown): void {
  if (error instanceof Error) {
    if ('code' in error && typeof error.code === 'string') {
      outputError(error.message, error.code);
    } else {
      outputError(error.message, 'BROWSER_ERROR');
    }
  } else {
    outputError('Unknown error occurred', 'INTERNAL_ERROR');
  }
}
