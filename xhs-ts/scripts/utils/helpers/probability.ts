/**
 * Probability utilities for human-like behavior
 *
 * @module utils/helpers/probability
 * @description Statistical distributions for realistic automation timing
 *
 * Note: This module is an internal implementation detail.
 * Use gaussianDelay() from helpers/index.ts for delays.
 */

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
 * @returns Random number from N(mean, stdDev^2)
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
 * Used internally by gaussianDelay() in helpers/index.ts
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
