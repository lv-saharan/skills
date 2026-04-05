/**
 * Global configuration management
 *
 * @module config/config
 * @description Configuration loading and parsing from environment variables
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import type { AppConfig } from './types';

// ============================================
// Environment Loading
// ============================================

dotenv.config();

// ============================================
// Configuration Parsing (Internal)
// ============================================

/**
 * Check if the current environment supports a graphical display
 */
function hasDisplaySupport(): boolean {
  const platform = process.platform;

  if (platform === 'linux') {
    return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  }

  return true;
}

/**
 * Parse headless mode with display support check
 */
function parseHeadless(value: string | undefined): boolean {
  if (!hasDisplaySupport()) {
    return true;
  }

  if (value === undefined || value === '') {
    return false;
  }
  return value !== 'false';
}

/**
 * Parse boolean from environment
 */
function parseBoolean(value: string | undefined, defaultValue: boolean = true): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value !== 'false';
}

// ============================================
// Application Configuration
// ============================================

/**
 * Application configuration loaded from environment
 */
export const config: AppConfig = {
  proxy: process.env.PROXY || undefined,
  headless: parseHeadless(process.env.HEADLESS),
  browserPath: process.env.BROWSER_PATH || undefined,
  browserChannel: process.env.BROWSER_CHANNEL || undefined,
  debug: parseBoolean(process.env.DEBUG, false),
};

// ============================================
// Configuration Validation
// ============================================

/**
 * Validate configuration and log warnings
 */
export function validateConfig(): void {
  if (config.headless && !config.proxy) {
    console.error('[WARN] Running in headless mode without proxy may be detected.');
  }

  if (config.browserPath && !existsSync(config.browserPath)) {
    console.error('[WARN] Browser path specified but file not found: ' + config.browserPath);
  }
}
