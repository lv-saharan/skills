/**
 * Wait utilities
 *
 * @module core/utils/wait
 * @description Platform-agnostic condition waiting functions
 */

import { delay } from './delay';

/**
 * Options for waitForCondition
 */
export interface WaitForConditionOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Polling interval in milliseconds (default: 1000) */
  interval?: number;
  /** Custom timeout error message */
  timeoutMessage?: string;
  /** Called periodically with elapsed time (for progress logging) */
  onProgress?: (elapsed: number) => void;
  /** Progress callback interval in milliseconds (default: 10000) */
  progressInterval?: number;
}

/**
 * Wait for a condition to become true
 *
 * @param condition - Async function that returns true when condition is met
 * @param options - Configuration options
 * @throws Error if timeout is reached
 *
 * @example
 * ```typescript
 * // Wait for login redirect
 * await waitForCondition(
 *   async () => {
 *     const url = page.url();
 *     return !url.includes('/login');
 *   },
 *   { timeout: 120000, timeoutMessage: 'Login timeout' }
 * );
 * ```
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: WaitForConditionOptions = {}
): Promise<void> {
  const {
    timeout = 30000,
    interval = 1000,
    timeoutMessage = 'Condition not met within timeout',
    onProgress,
    progressInterval = 10000,
  } = options;

  const startTime = Date.now();
  let lastProgressTime = startTime;

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }

    // Call progress callback periodically
    if (onProgress) {
      const now = Date.now();
      if (now - lastProgressTime >= progressInterval) {
        onProgress(Math.floor((now - startTime) / 1000));
        lastProgressTime = now;
      }
    }

    await delay(interval);
  }

  throw new Error(timeoutMessage);
}
