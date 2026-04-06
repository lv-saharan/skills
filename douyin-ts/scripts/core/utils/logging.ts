/**
 * Logging utilities
 *
 * @module core/utils/logging
 * @description Platform-agnostic debug logging
 */

/**
 * Log debug messages (only when DEBUG=true)
 *
 * @param args - Arguments to log
 */
export function debugLog(...args: unknown[]): void {
  if (process.env.DEBUG === 'true') {
    console.log('[DEBUG]', ...args);
  }
}
