/**
 * Utils module
 *
 * @module utils
 * @description Common utilities used across all modules
 */

// Logging (from dedicated module)
// Helpers
export {
  debugLog,
  config,
  delay,
  randomDelay,
  randomString,
  DY_URLS,
  isDouyinUrl,
  retry,
  waitForCondition,
} from './helpers';

// Helper types
export type { WaitForConditionOptions } from './helpers';

// Anti-detect utilities
export {
  humanClick,
  humanType,
  humanScroll,
  humanMouseMove,
  checkCaptcha,
  checkLoginStatus,
  waitForStable,
  simulateReading,
} from './anti-detect';

// Output functions
export { outputSuccess, outputError, outputQrCode, output, outputFromError } from './output';

// Output types
export type { SuccessResponse, ErrorResponse, CliOutput } from './output/types';
