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

// Re-export probability utilities
export {
  gaussianRandom,
  gaussianRandomClamped,
  humanDelay,
  humanDelayBounded,
  timeAwareDelay,
  readingDelay,
  profileDelay,
  actionDelay,
  BEHAVIOR_PROFILES,
  ACTION_TIMING,
} from './probability';

export type { BehaviorProfileName } from './probability';

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
 * Random delay between min and max milliseconds (uniform distribution)
 * Used for non-behavioral delays (timeouts, retries, etc.)
 */
export function randomDelay(min = 1000, max = 3000): Promise<void> {
  const ms = Math.random() * (max - min) + min;
  return delay(ms);
}

/**
 * Get time-of-day multiplier for human-like behavior
 *
 * Simulates natural human behavior patterns:
 * - Late night (0-6): Slower, more deliberate actions (1.3-1.6x)
 * - Early morning (6-9): Gradually speeding up (1.1-1.3x)
 * - Late morning (9-12): Normal speed (0.9-1.1x)
 * - Afternoon (12-18): Slightly faster, work mode (0.8-1.0x)
 * - Early evening (18-21): Normal to slightly slower (1.0-1.2x)
 * - Late evening (21-24): Slower, relaxing (1.1-1.4x)
 */
function getTimeMultiplier(): number {
  const hour = new Date().getHours();

  if (hour < 6) {
    // Late night: 1.3-1.6x slower
    return 1.3 + Math.random() * 0.3;
  } else if (hour < 9) {
    // Early morning: 1.1-1.3x slower
    return 1.1 + Math.random() * 0.2;
  } else if (hour < 12) {
    // Late morning: 0.9-1.1x (normal)
    return 0.9 + Math.random() * 0.2;
  } else if (hour < 18) {
    // Afternoon: 0.8-1.0x (slightly faster, work mode)
    return 0.8 + Math.random() * 0.2;
  } else if (hour < 21) {
    // Early evening: 1.0-1.2x (normal to slightly slower)
    return 1.0 + Math.random() * 0.2;
  } else {
    // Late evening: 1.1-1.4x slower
    return 1.1 + Math.random() * 0.3;
  }
}

/**
 * Gaussian (normal) distribution delay - more human-like timing
 *
 * Use this for behavioral delays (clicks, scrolls, typing) to avoid detection.
 * Unlike uniform random, human actions cluster around a mean with some variation.
 *
 * @param options - Delay options
 * @param options.mean - Mean delay in ms (default: 2000)
 * @param options.stdDev - Standard deviation in ms (default: 500)
 * @param options.min - Minimum delay in ms (default: mean/2)
 * @param options.max - Maximum delay in ms (default: mean*2)
 * @param options.timeAware - Apply time-of-day adjustment (default: true)
 */
export async function gaussianDelay(options?: {
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  timeAware?: boolean;
}): Promise<void> {
  const mean = options?.mean ?? 2000;
  const stdDev = options?.stdDev ?? 500;
  const min = options?.min ?? Math.floor(mean / 2);
  const max = options?.max ?? mean * 2;
  const timeAware = options?.timeAware !== false; // Default: true

  const { gaussianRandomClamped } = await import('./probability');
  let ms = Math.floor(gaussianRandomClamped(mean, stdDev, min, max));

  // Apply time-of-day adjustment if enabled
  if (timeAware) {
    ms = Math.floor(ms * getTimeMultiplier());
  }

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
