/**
 * Output module entry
 *
 * @module core/utils/output
 * @description Standardized JSON output formatting (platform-agnostic)
 */

export { outputSuccess, outputQrCode, outputCaptcha, outputError, outputFromError } from './format';
export type {
  SuccessResponse,
  ErrorResponse,
  CliOutput,
  QrCodeOutput,
  CaptchaOutput,
} from './types';
