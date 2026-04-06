/**
 * Timing utilities
 *
 * @module core/utils/delay
 * @description Platform-agnostic delay functions
 */

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

  // Box-Muller transform for Gaussian distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  let ms = Math.max(min, Math.min(max, Math.floor(z0 * stdDev + mean)));

  // Apply time-of-day adjustment if enabled
  if (timeAware) {
    ms = Math.floor(ms * getTimeMultiplier());
  }

  return delay(ms);
}
