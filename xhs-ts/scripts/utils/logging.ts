/**
 * Logging utilities
 *
 * @module utils/logging
 * @description Debug logging functionality
 */

import { config } from '../config';

/**
 * Debug log (only outputs when DEBUG=true)
 */
export function debugLog(...args: unknown[]): void {
  if (config.debug) {
    console.error('[DEBUG]', ...args);
  }
}
