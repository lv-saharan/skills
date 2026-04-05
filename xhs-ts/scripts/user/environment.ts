/**
 * Environment detection module
 *
 * @module user/environment
 * @description Detect device environment for fingerprint generation
 */

import type { EnvironmentType } from './types';
import { debugLog } from '../utils/helpers';

// ============================================
// Display Support Detection
// ============================================

/**
 * Check if the current environment supports a graphical display
 *
 * @returns true if GUI is available, false for headless/server environments
 */
export function hasDisplaySupport(): boolean {
  const platform = process.platform;

  // Linux: check for DISPLAY or WAYLAND_DISPLAY
  if (platform === 'linux') {
    return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  }

  // Windows and macOS typically have display support
  return true;
}

// ============================================
// Environment Type Detection
// ============================================

/**
 * Detect the environment type
 *
 * @returns Environment type based on display support and other factors
 */
export function detectEnvironmentType(): EnvironmentType {
  if (hasDisplaySupport()) {
    return 'gui-native';
  }

  // No display - use headless-smart by default
  return 'headless-smart';
}
