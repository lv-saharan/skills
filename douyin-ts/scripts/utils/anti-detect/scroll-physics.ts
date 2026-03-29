/**
 * Human-like scroll behavior with physics
 *
 * @module utils/anti-detect/scroll-physics
 * @description Realistic scroll simulation with acceleration, momentum, and pauses
 *
 * Based on research from:
 * - cloakbrowser-human: https://github.com/evelaa123/cloakbrowser-human
 */

import type { Page } from 'playwright';
import { delay } from '../helpers';

// ============================================
// Types
// ============================================

interface ScrollOptions {
  /** Scroll direction */
  direction?: 'down' | 'up';
  /** Scroll distance in pixels (default: 200-500 random) */
  distance?: number;
  /** Include reading pauses */
  includePauses?: boolean;
  /** Scroll speed: slow, normal, fast */
  speed?: 'slow' | 'normal' | 'fast';
}

// ============================================
// Constants
// ============================================

/** Speed multipliers for different scroll speeds */
const SPEED_FACTORS = {
  slow: 1.5,
  normal: 1.0,
  fast: 0.6,
};

// ============================================
// Main Functions
// ============================================

/**
 * Human-like scroll with physics simulation
 *
 * Features:
 * - Acceleration phase (starts slow)
 * - Stable velocity phase
 * - Deceleration phase (stops smoothly)
 * - Random reading pauses
 * - Occasional reverse scroll
 *
 * @param page - Playwright page
 * @param options - Scroll options
 */
export async function humanScrollPhysics(page: Page, options: ScrollOptions = {}): Promise<void> {
  const {
    direction = 'down',
    distance = 200 + Math.random() * 300,
    includePauses = true,
    speed = 'normal',
  } = options;

  const sign = direction === 'down' ? 1 : -1;
  const speedFactor = SPEED_FACTORS[speed];

  // Physics phases: accelerate (20%) -> stable (50%) -> decelerate (30%)
  const phases = [
    { ratio: 0.2, acceleration: 1.5 }, // Acceleration
    { ratio: 0.5, acceleration: 0 }, // Stable
    { ratio: 0.3, acceleration: -2 }, // Deceleration
  ];

  let velocity = 0;
  const maxVelocity = distance / 12;

  for (const phase of phases) {
    const phaseDistance = distance * phase.ratio;
    let scrolled = 0;

    while (scrolled < phaseDistance) {
      // Update velocity based on phase
      velocity = Math.max(3, Math.min(maxVelocity, velocity + phase.acceleration * 0.5));

      // Calculate scroll delta
      const remaining = phaseDistance - scrolled;
      const delta = Math.min(velocity, remaining);

      // Perform scroll
      await page.mouse.wheel(0, sign * delta);
      scrolled += delta;

      // Delay between scroll steps
      const baseDelay = (15 + Math.random() * 15) * speedFactor;
      await delay(baseDelay);

      // Random pause (simulating reading)
      if (includePauses && Math.random() < 0.02) {
        await delay(80 + Math.random() * 150);
      }
    }
  }
}

/**
 * Scroll to a specific position with physics
 *
 * @param page - Playwright page
 * @param targetY - Target scroll Y position
 */
export async function humanScrollToPosition(page: Page, targetY: number): Promise<void> {
  // Get current scroll position
  const currentY = await page.evaluate(() => window.scrollY);
  const distance = Math.abs(targetY - currentY);
  const direction = targetY > currentY ? 'down' : 'up';

  if (distance < 50) {
    return; // Already close enough
  }

  await humanScrollPhysics(page, {
    direction,
    distance,
    includePauses: false,
  });
}

/**
 * Scroll to bottom of page with natural behavior
 *
 * @param page - Playwright page
 * @param options - Scroll options
 */
export async function humanScrollToBottom(
  page: Page,
  options: { maxScrolls?: number; pauseBetween?: number } = {}
): Promise<void> {
  const { maxScrolls = 5, pauseBetween = 1500 } = options;

  let scrollCount = 0;
  let lastScrollHeight = 0;

  while (scrollCount < maxScrolls) {
    // Check if we've reached the bottom
    const result = await page.evaluate(() => ({
      scrollHeight: document.body.scrollHeight,
      scrollTop: window.scrollY,
      clientHeight: window.innerHeight,
    }));

    if (result.scrollTop + result.clientHeight >= result.scrollHeight - 100) {
      break; // Reached bottom
    }

    // Check if page is growing (infinite scroll)
    if (result.scrollHeight === lastScrollHeight) {
      scrollCount++;
    } else {
      lastScrollHeight = result.scrollHeight;
    }

    // Scroll
    await humanScrollPhysics(page, {
      direction: 'down',
      distance: 300 + Math.random() * 200,
      includePauses: true,
    });

    // Pause between scrolls (reading)
    await delay(pauseBetween + Math.random() * 500);
  }
}

/**
 * Simulate reading while scrolling (scroll-pause-read pattern)
 *
 * @param page - Playwright page
 * @param options - Reading options
 */
export async function humanScrollRead(
  page: Page,
  options: {
    /** Total scroll distance */
    distance?: number;
    /** Number of pause points */
    pausePoints?: number;
    /** Pause duration range [min, max] in ms */
    pauseDuration?: [number, number];
  } = {}
): Promise<void> {
  const {
    distance = 800 + Math.random() * 400,
    pausePoints = 2 + Math.floor(Math.random() * 3),
    pauseDuration = [500, 1500],
  } = options;

  const segmentDistance = distance / (pausePoints + 1);

  for (let i = 0; i <= pausePoints; i++) {
    // Scroll segment
    await humanScrollPhysics(page, {
      direction: 'down',
      distance: segmentDistance,
      includePauses: false,
      speed: 'normal',
    });

    // Pause to "read"
    if (i < pausePoints) {
      const [minPause, maxPause] = pauseDuration;
      await delay(minPause + Math.random() * (maxPause - minPause));
    }
  }
}