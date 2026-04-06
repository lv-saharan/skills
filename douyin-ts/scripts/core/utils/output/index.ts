/**
 * Output module entry
 *
 * @module core/utils/output
 * @description Standardized JSON output formatting (platform-agnostic)
 */

export { outputSuccess, outputQrCode, outputError, outputFromError } from './format';
export type { SuccessResponse, ErrorResponse, CliOutput, QrCodeOutput } from './types';
