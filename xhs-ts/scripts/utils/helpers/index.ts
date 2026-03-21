/**
 * Helper utilities
 *
 * @module utils/helpers
 * @description Common utility functions used across modules
 */

import { config } from '../../config';
import { debugLog } from '../logging';

// Re-export debugLog from logging module
export { debugLog };
import { XHS_URLS } from '../../shared';

// Re-export config for backward compatibility
export { config };

// Re-export XHS_URLS from shared (single source of truth)
export { XHS_URLS };

// ============================================
// Timing Utilities
// ============================================

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random delay between min and max milliseconds
 * Used for anti-detection purposes
 */
export function randomDelay(min = 1000, max = 3000): Promise<void> {
  const ms = Math.random() * (max - min) + min;
  return delay(ms);
}

// ============================================
// String Utilities
// ============================================

/**
 * Generate random string for tracking purposes
 */
export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================
// URL Utilities
// ============================================

/**
 * Check if URL is a valid Xiaohongshu URL
 */
export function isXhsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('xiaohongshu.com');
  } catch {
    return false;
  }
}

// ============================================
// Retry Utilities
// ============================================

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (): boolean => true,
  } = options;

  let lastError: unknown;
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      debugLog(`Attempt ${attempt} failed, retrying in ${currentDelay}ms`);
      await delay(currentDelay);
      currentDelay = Math.min(currentDelay * 2, maxDelay);
    }
  }

  throw lastError;
}

// ============================================
// Polling Utilities
// ============================================

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
 * // Wait for login redirect
 * await waitForCondition(
 *   async () => {
 *     const url = page.url();
 *     return !url.includes('/login') && url.includes('xiaohongshu.com');
 *   },
 *   { timeout: 120000, timeoutMessage: 'Login timeout' }
 * );
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
