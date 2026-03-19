/**
 * General helper utilities
 *
 * @module helpers
 * @description Common utility functions used across modules
 */

import { config } from '../config';

// Re-export config for backward compatibility
export { config };

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
// Logging Utilities
// ============================================

/**
 * Debug log (only outputs when DEBUG=true)
 */
export function debugLog(...args: unknown[]): void {
  if (config.debug) {
    console.error('[DEBUG]', ...args);
  }
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

/** Xiaohongshu base URLs */
export const XHS_URLS = {
  home: 'https://www.xiaohongshu.com',
  login: 'https://www.xiaohongshu.com/login',
  explore: 'https://www.xiaohongshu.com/explore',
} as const;

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
