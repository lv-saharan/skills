/**
 * Helper utilities - Compatibility Layer
 *
 * @module utils/helpers
 * @description Re-exports from core/utils for backward compatibility
 */

// Re-export from core/utils
export {
  debugLog,
  delay,
  gaussianDelay,
  waitForCondition,
} from '../../core/utils';

export type { WaitForConditionOptions } from '../../core/utils';

// Re-export from config
export { config, DY_URLS } from '../../config';

// Random delay utility
export function randomDelay(min = 1000, max = 3000): Promise<void> {
  const ms = Math.random() * (max - min) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gaussian random utilities
export function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

export function gaussianRandomClamped(mean: number, stdDev: number, min: number, max: number): number {
  let value = gaussianRandom(mean, stdDev);
  return Math.max(min, Math.min(max, value));
}

// Behavior profiles
export const BEHAVIOR_PROFILES = {
  default: { mean: 2000, stdDev: 500 },
  fast: { mean: 1000, stdDev: 300 },
  slow: { mean: 3000, stdDev: 800 },
} as const;

export const ACTION_TIMING = {
  click: { mean: 500, stdDev: 150 },
  scroll: { mean: 800, stdDev: 200 },
  type: { mean: 100, stdDev: 50 },
} as const;

export type BehaviorProfileName = keyof typeof BEHAVIOR_PROFILES;

// Time-aware delay utilities
export async function humanDelay(baseMs: number): Promise<void> {
  const { gaussianDelay } = await import('../../core/utils');
  return gaussianDelay({ mean: baseMs, stdDev: baseMs * 0.25 });
}

export async function humanDelayBounded(minMs: number, maxMs: number): Promise<void> {
  const { gaussianDelay } = await import('../../core/utils');
  const mean = (minMs + maxMs) / 2;
  return gaussianDelay({ mean, stdDev: mean * 0.25, min: minMs, max: maxMs });
}

export async function timeAwareDelay(baseMs: number): Promise<void> {
  const { gaussianDelay } = await import('../../core/utils');
  return gaussianDelay({ mean: baseMs, stdDev: baseMs * 0.25, timeAware: true });
}

export async function readingDelay(): Promise<void> {
  const { gaussianDelay } = await import('../../core/utils');
  return gaussianDelay({ mean: 2000, stdDev: 800 });
}

export async function profileDelay(profile: BehaviorProfileName = 'default'): Promise<void> {
  const { gaussianDelay } = await import('../../core/utils');
  const p = BEHAVIOR_PROFILES[profile];
  return gaussianDelay({ mean: p.mean, stdDev: p.stdDev });
}

export async function actionDelay(action: keyof typeof ACTION_TIMING = 'click'): Promise<void> {
  const { gaussianDelay } = await import('../../core/utils');
  const t = ACTION_TIMING[action];
  return gaussianDelay({ mean: t.mean, stdDev: t.stdDev });
}

// URL utilities
export function isDouyinUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('douyin.com');
  } catch {
    return false;
  }
}

export function isXhsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('xiaohongshu.com');
  } catch {
    return false;
  }
}

// Random string
export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Retry utility
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

      const { debugLog, delay } = await import('../../core/utils');
      debugLog(`Attempt ${attempt} failed, retrying in ${currentDelay}ms`);
      await delay(currentDelay);
      currentDelay = Math.min(currentDelay * 2, maxDelay);
    }
  }

  throw lastError;
}
