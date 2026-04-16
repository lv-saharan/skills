/**
 * Output formatting utilities
 *
 * @module core/utils/output/format
 * @description Standardized JSON output formatting for all CLI commands (platform-agnostic)
 */

import type { SuccessResponse, ErrorResponse, QrCodeOutput, CaptchaOutput } from './types';

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
 * Output captcha screenshot for headless mode (consumed by OpenClaw)
 *
 * @param captchaPath - Absolute path to captcha screenshot image
 * @param message - Platform-specific message to display
 */
export function outputCaptcha(captchaPath: string, message = '检测到验证码，请手动完成'): void {
  const response: CaptchaOutput = {
    type: 'captcha_required',
    status: 'waiting_completion',
    captchaPath,
    toAgent: 'DISPLAY_IMAGE:captchaPath:WAIT:请手动完成验证码',
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
