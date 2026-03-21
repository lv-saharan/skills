/**
 * Global configuration management
 *
 * @module config/config
 * @description Configuration loading and parsing from environment variables
 */

import dotenv from 'dotenv';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { AppConfig } from './types';
import type { LoginMethod } from '../shared';

// ============================================
// Environment Loading
// ============================================

// Load environment variables from .env file
dotenv.config();

// ============================================
// Configuration Parsing
// ============================================

/**
 * Check if the current environment supports a graphical display
 */
function hasDisplaySupport(): boolean {
  const platform = process.platform;

  // Linux: check for DISPLAY or WAYLAND_DISPLAY
  if (platform === 'linux') {
    return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  }

  // Windows and macOS typically have display support
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
 * Parse login method from environment
 */
function parseLoginMethod(value: string | undefined): LoginMethod {
  if (value === 'sms') {
    return 'sms';
  }
  return 'qr';
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

/**
 * Parse integer from environment with default
 */
function parseInteger(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ============================================
// Directory Configuration
// ============================================

/**
 * Get project root directory
 */
export function getProjectRoot(): string {
  return process.cwd();
}

/**
 * Get tmp directory path (create if not exists)
 */
export function getTmpDir(): string {
  const tmpDir = path.resolve(getProjectRoot(), 'tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}

/**
 * Generate timestamp string for file naming
 */
export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Generate file name with category and timestamp
 */
export function generateFileName(category: string, ext: string): string {
  return `${category}_${generateTimestamp()}.${ext}`;
}

/**
 * Get full path for a file in tmp directory
 */
export function getTmpFilePath(category: string, ext: string): string {
  return path.resolve(getTmpDir(), generateFileName(category, ext));
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
  loginTimeout: parseInteger(process.env.LOGIN_TIMEOUT, 120000),
  loginMethod: parseLoginMethod(process.env.LOGIN_METHOD),
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
    console.error(`[WARN] Browser path specified but file not found: ${config.browserPath}`);
  }
}
