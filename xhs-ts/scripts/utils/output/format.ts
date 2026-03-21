/**
 * Output formatting utilities
 *
 * @module utils/output/format
 * @description Standardized JSON output formatting for all CLI commands
 */

import type { XhsErrorCodeType } from '../../shared';
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
 */
export function outputQrCode(qrPath: string): void {
  const response: QrCodeOutput = {
    type: 'qr_login',
    status: 'waiting_scan',
    qrPath,
    toAgent: 'DISPLAY_IMAGE:qrPath:WAIT:扫码',
    message: '请使用小红书 App 扫描二维码登录',
  };
  console.log(JSON.stringify(response, null, 2));
}

/**
 * Output error response as JSON to stderr
 */
export function outputError(message: string, code: XhsErrorCodeType, details?: unknown): void {
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
 * Output error from XhsError instance
 */
export function outputFromError(error: unknown): void {
  if (error instanceof Error) {
    if ('code' in error && typeof error.code === 'string') {
      outputError(error.message, error.code as XhsErrorCodeType);
    } else {
      outputError(error.message, 'BROWSER_ERROR' as XhsErrorCodeType);
    }
  } else {
    outputError('Unknown error occurred', 'BROWSER_ERROR' as XhsErrorCodeType);
  }
}
