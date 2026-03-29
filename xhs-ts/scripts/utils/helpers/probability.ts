/**
 * Probability and timing utilities for human-like behavior
 *
 * @module utils/helpers/probability
 * @description Statistical distributions and time-aware delays for realistic automation
 */

import { delay } from './index';

// ============================================
// Gaussian (Normal) Distribution
// ============================================

/**
 * Generate a random number from a Gaussian (normal) distribution
 *
 * Uses the Box-Muller transform for efficiency.
 *
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation
 * @returns Random number from N(mean, stdDev²)
 */
export function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();

  // Box-Muller transform
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  return z0 * stdDev + mean;
}

/**
 * Generate a random number from a Gaussian distribution, clamped to a range
 *
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random number from clamped Gaussian distribution
 */
export function gaussianRandomClamped(
  mean: number,
  stdDev: number,
  min: number,
  max: number
): number {
  const value = gaussianRandom(mean, stdDev);
  return Math.max(min, Math.min(max, value));
}

// ============================================
// Human-Like Delays
// ============================================

/**
 * Human-like delay using Gaussian distribution
 *
 * Unlike uniform random delays, this creates a more natural timing
 * pattern that clusters around the mean with some variation.
 *
 * @param mean - Mean delay in milliseconds
 * @param stdDev - Standard deviation in milliseconds
 * @returns Promise that resolves after the delay
 */
export async function humanDelay(mean: number, stdDev: number): Promise<void> {
  const ms = Math.max(50, Math.floor(gaussianRandom(mean, stdDev)));
  return delay(ms);
}

/**
 * Human-like delay with bounds
 *
 * @param mean - Mean delay in milliseconds
 * @param stdDev - Standard deviation in milliseconds
 * @param min - Minimum delay
 * @param max - Maximum delay
 */
export async function humanDelayBounded(
  mean: number,
  stdDev: number,
  min: number,
  max: number
): Promise<void> {
  const ms = Math.floor(gaussianRandomClamped(mean, stdDev, min, max));
  return delay(ms);
}

// ============================================
// Time-Aware Delays
// ============================================

/**
 * Time-of-day aware delay
 *
 * Simulates natural human behavior patterns:
 * - Late night (0-6): Slower, more deliberate actions
 * - Morning (6-12): Gradually speeding up
 * - Afternoon (12-18): Normal speed
 * - Evening (18-24): Slightly slower, more relaxed
 *
 * @param baseMs - Base delay in milliseconds
 * @returns Promise that resolves after the time-adjusted delay
 */
export async function timeAwareDelay(baseMs: number): Promise<void> {
  const hour = new Date().getHours();

  let multiplier = 1.0;

  if (hour < 6) {
    // Late night: 1.3-1.6x slower
    multiplier = 1.3 + Math.random() * 0.3;
  } else if (hour < 9) {
    // Early morning: 1.1-1.3x slower
    multiplier = 1.1 + Math.random() * 0.2;
  } else if (hour < 12) {
    // Late morning: 0.9-1.1x (normal)
    multiplier = 0.9 + Math.random() * 0.2;
  } else if (hour < 18) {
    // Afternoon: 0.8-1.0x (slightly faster, work mode)
    multiplier = 0.8 + Math.random() * 0.2;
  } else if (hour < 21) {
    // Early evening: 1.0-1.2x (normal to slightly slower)
    multiplier = 1.0 + Math.random() * 0.2;
  } else {
    // Late evening: 1.1-1.4x slower
    multiplier = 1.1 + Math.random() * 0.3;
  }

  const ms = Math.floor(baseMs * multiplier);
  return delay(ms);
}

// ============================================
// Reading Behavior Simulation
// ============================================

/**
 * Calculate reading delay based on content length
 *
 * Assumes average reading speed of 300-500 Chinese characters per minute.
 *
 * @param contentLength - Number of characters
 * @param speedProfile - Reading speed: 'slow', 'normal', or 'fast'
 */
export async function readingDelay(
  contentLength: number,
  speedProfile: 'slow' | 'normal' | 'fast' = 'normal'
): Promise<void> {
  // Characters per minute based on speed profile
  const speeds = {
    slow: 250,
    normal: 400,
    fast: 550,
  };

  const cpm = speeds[speedProfile];
  const minutes = contentLength / cpm;
  const baseMs = minutes * 60 * 1000;

  // Add 20-40% random variation
  const ms = baseMs * (0.8 + Math.random() * 0.4);

  // Minimum 500ms, maximum 30 seconds
  return delay(Math.max(500, Math.min(30000, Math.floor(ms))));
}

// ============================================
// Behavior Profiles
// ============================================

/** Predefined behavior timing profiles */
export const BEHAVIOR_PROFILES = {
  /** Quick browser: scans content quickly */
  quick: {
    pageLoad: { mean: 1500, stdDev: 400 },
    scrollPause: { mean: 500, stdDev: 200 },
    actionDelay: { mean: 800, stdDev: 300 },
  },
  /** Normal reader: average engagement */
  normal: {
    pageLoad: { mean: 2500, stdDev: 600 },
    scrollPause: { mean: 1000, stdDev: 400 },
    actionDelay: { mean: 1500, stdDev: 500 },
  },
  /** Deep reader: thorough content consumption */
  deep: {
    pageLoad: { mean: 4000, stdDev: 1000 },
    scrollPause: { mean: 2000, stdDev: 800 },
    actionDelay: { mean: 2500, stdDev: 700 },
  },
} as const;

export type BehaviorProfileName = keyof typeof BEHAVIOR_PROFILES;

/**
 * Get a random delay based on a behavior profile
 *
 * @param profile - Behavior profile name
 * @param type - Type of delay within the profile
 */
export async function profileDelay(
  profile: BehaviorProfileName,
  type: 'pageLoad' | 'scrollPause' | 'actionDelay'
): Promise<void> {
  const { mean, stdDev } = BEHAVIOR_PROFILES[profile][type];
  return humanDelay(mean, stdDev);
}

// ============================================
// Action Timing Constants
// ============================================

/** Recommended timing for various actions (all in milliseconds) */
export const ACTION_TIMING = {
  /** Delay after page navigation */
  afterNavigation: { mean: 2500, stdDev: 800, min: 1500, max: 4000 },

  /** Delay before clicking */
  beforeClick: { mean: 300, stdDev: 100, min: 150, max: 600 },

  /** Delay after clicking */
  afterClick: { mean: 1000, stdDev: 400, min: 500, max: 2000 },

  /** Delay between typing characters */
  typingChar: { mean: 50, stdDev: 20, min: 30, max: 100 },

  /** Delay between batch operations */
  batchInterval: { mean: 3000, stdDev: 1000, min: 2000, max: 5000 },

  /** Delay when scrolling */
  scrollStep: { mean: 150, stdDev: 50, min: 100, max: 300 },
} as const;

/**
 * Convenience function for common action delays
 */
export async function actionDelay(action: keyof typeof ACTION_TIMING): Promise<void> {
  const { mean, stdDev, min, max } = ACTION_TIMING[action];
  return humanDelayBounded(mean, stdDev, min, max);
}
