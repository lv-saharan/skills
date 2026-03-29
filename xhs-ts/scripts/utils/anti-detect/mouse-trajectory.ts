/**
 * Human-like mouse movement with Bezier curves
 *
 * @module utils/anti-detect/mouse-trajectory
 * @description Realistic mouse movement simulation using Bezier curves with acceleration profiles
 *
 * Based on research from:
 * - cloakbrowser-human: https://github.com/evelaa123/cloakbrowser-human
 * - human_mouse: https://github.com/sarperavci/human_mouse
 */

import type { Page } from 'playwright';
import { delay } from '../helpers';

// ============================================
// Types
// ============================================

interface Point {
  x: number;
  y: number;
}

interface MouseMoveOptions {
  /** Path wobble amplitude (0-1, default 0.2) */
  wobble?: number;
  /** Allow overshooting target (default: random 30% chance) */
  overshoot?: boolean;
  /** Jitter amplitude in pixels (default 2) */
  jitter?: number;
}

// Extend Window interface for mouse position tracking
declare global {
  interface Window {
    __mouseX?: number;
    __mouseY?: number;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Ease in-out cubic: slow → fast → slow
 *
 * Provides natural acceleration and deceleration.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Generate a random point within bounds
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Calculate distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

// ============================================
// Bezier Curve Generation
// ============================================

/**
 * Generate Bezier curve path from start to end
 *
 * Uses cubic Bezier curve with random control points for natural movement.
 */
function generateBezierPath(start: Point, end: Point, options: MouseMoveOptions = {}): Point[] {
  const { wobble = 0.2, jitter = 2 } = options;

  const dist = distance(start, end);

  // Number of steps based on distance (longer distance = more steps)
  const minSteps = 8;
  const maxSteps = 50;
  const steps = Math.max(minSteps, Math.min(maxSteps, Math.floor(dist / 8)));

  // Random control points for cubic Bezier curve
  // Offset range is based on distance and wobble factor
  const offsetRange = dist * wobble;

  // First control point (1/3 of the way)
  const cp1: Point = {
    x: start.x + (end.x - start.x) * 0.33 + (Math.random() - 0.5) * offsetRange,
    y: start.y + (end.y - start.y) * 0.33 + (Math.random() - 0.5) * offsetRange,
  };

  // Second control point (2/3 of the way)
  const cp2: Point = {
    x: start.x + (end.x - start.x) * 0.66 + (Math.random() - 0.5) * offsetRange,
    y: start.y + (end.y - start.y) * 0.66 + (Math.random() - 0.5) * offsetRange,
  };

  const path: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Apply easing for natural acceleration
    const easedT = easeInOutCubic(t);

    // Cubic Bezier formula
    const mt = 1 - easedT;
    const x =
      mt * mt * mt * start.x +
      3 * mt * mt * easedT * cp1.x +
      3 * mt * easedT * easedT * cp2.x +
      easedT * easedT * easedT * end.x;
    const y =
      mt * mt * mt * start.y +
      3 * mt * mt * easedT * cp1.y +
      3 * mt * easedT * easedT * cp2.y +
      easedT * easedT * easedT * end.y;

    // Add micro-jitter (more in the middle, less at the ends)
    const jitterFactor = 1 - Math.abs(t - 0.5) * 2;
    const jx = (Math.random() - 0.5) * jitter * jitterFactor;
    const jy = (Math.random() - 0.5) * jitter * jitterFactor;

    path.push({ x: x + jx, y: y + jy });
  }

  return path;
}

// ============================================
// Main Function
// ============================================

/**
 * Human-like mouse movement using Bezier curves
 *
 * Features:
 * - Bezier curve trajectory (not straight lines)
 * - Acceleration/deceleration profile
 * - Micro-jitter for realism
 * - Optional overshoot behavior
 * - Position tracking for continuous movements
 *
 * @param page - Playwright page
 * @param targetX - Target X coordinate
 * @param targetY - Target Y coordinate
 * @param options - Movement options
 */
export async function humanMouseMoveBezier(
  page: Page,
  targetX: number,
  targetY: number,
  options: MouseMoveOptions = {}
): Promise<void> {
  const { overshoot = Math.random() > 0.7 } = options;

  // Get current mouse position from page
  const current = await page.evaluate(() => ({
    x: window.__mouseX ?? 100 + Math.random() * 200,
    y: window.__mouseY ?? 100 + Math.random() * 200,
  }));

  const dist = distance(current, { x: targetX, y: targetY });

  // Skip if already at target
  if (dist < 5) {
    return;
  }

  // Determine if we should overshoot
  const shouldOvershoot = overshoot && dist > 100;
  const overshootAmount = shouldOvershoot ? randomInRange(10, 30) : 0;

  // Calculate end point (possibly with overshoot)
  const angle = Math.atan2(targetY - current.y, targetX - current.x);
  const actualEnd: Point = shouldOvershoot
    ? {
        x: targetX + Math.cos(angle) * overshootAmount,
        y: targetY + Math.sin(angle) * overshootAmount,
      }
    : { x: targetX, y: targetY };

  // Generate path
  const path = generateBezierPath(current, actualEnd, options);

  // Move along the path
  for (let i = 0; i < path.length; i++) {
    const point = path[i];
    const progress = i / (path.length - 1);

    await page.mouse.move(point.x, point.y);

    // Variable delay: edges are slower, middle is faster
    // This creates natural acceleration/deceleration
    const baseDelay = 5;
    const speedFactor = 1 + Math.abs(progress - 0.5) * 2;
    await delay(baseDelay * speedFactor + Math.random() * 3);
  }

  // If we overshot, move back to actual target
  if (shouldOvershoot) {
    await delay(30 + Math.random() * 50);
    await page.mouse.move(targetX, targetY, { steps: 3 });
  }

  // Store final position for tracking
  await page.evaluate(
    ({ x, y }) => {
      window.__mouseX = x;
      window.__mouseY = y;
    },
    { x: targetX, y: targetY }
  );
}

/**
 * Move mouse to an element with Bezier curve
 *
 * @param page - Playwright page
 * @param selector - Element selector
 * @param options - Movement options
 */
export async function humanMouseMoveToElement(
  page: Page,
  selector: string,
  options: MouseMoveOptions = {}
): Promise<boolean> {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });

    const box = await element.boundingBox();
    if (!box) {
      return false;
    }

    // Target a random point within the element (not just center)
    const targetX = box.x + randomInRange(box.width * 0.2, box.width * 0.8);
    const targetY = box.y + randomInRange(box.height * 0.2, box.height * 0.8);

    await humanMouseMoveBezier(page, targetX, targetY, options);
    return true;
  } catch {
    return false;
  }
}
