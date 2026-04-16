/**
 * Utils module entry
 *
 * @module core/utils
 * @description Platform-agnostic utility functions
 */

// Timing
export { delay, randomDelay, gaussianDelay } from './delay';

// Waiting
export { waitForCondition, type WaitForConditionOptions } from './wait';

// Logging
export { debugLog } from './logging';

// Path utilities
export { generateTimestamp, getTmpDir, getTmpFilePath, SKILL_ROOT, buildPath } from './path';

// Output
export { outputSuccess, outputError, outputQrCode, outputCaptcha, outputFromError } from './output';
export type {
  SuccessResponse,
  ErrorResponse,
  CliOutput,
  QrCodeOutput,
  CaptchaOutput,
} from './output/types';
