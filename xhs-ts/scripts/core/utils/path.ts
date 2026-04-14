/**
 * Path utilities
 *
 * @module core/utils/path
 * @description Platform-agnostic path manipulation utilities
 */

import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// ============================================
// Root & Path Builder
// ============================================

/**
 * Skill project root directory (captured at module load time)
 *
 * All project-relative path resolution starts from here.
 */
export const SKILL_ROOT = process.cwd();

/**
 * Build absolute path from project root + relative segments
 *
 * @param segments - Path segments relative to project root
 * @returns Resolved absolute path
 *
 * @example
 * `	ypescript
 * buildPath('config.json')
 * // -> /path/to/xhs-ts/config.json
 *
 * buildPath('users', 'alice', 'profile.json')
 * // -> /path/to/xhs-ts/users/alice/profile.json
 * `
 */
export function buildPath(...segments: string[]): string {
  return path.resolve(SKILL_ROOT, ...segments);
}

// ============================================
// Constants
// ============================================

/** Users directory name */
const USERS_DIR = 'users';

// ============================================
// Timestamp Generation
// ============================================

/**
 * Generate timestamp string for file naming
 *
 * @returns Timestamp in format: YYYYMMDD_HHMMSS
 */
export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return year + month + day + '_' + hours + minutes + seconds;
}

// ============================================
// User Directory Utilities
// ============================================

/**
 * Get tmp directory path for a specific user
 *
 * Creates the directory if it doesn't exist.
 *
 * @param user - User name (defaults to 'default')
 * @returns Absolute path to user's tmp directory
 */
export function getTmpDir(user?: string): string {
  const userName = user || 'default';
  const tmpDir = buildPath(USERS_DIR, userName, 'tmp');
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}

/**
 * Get full path for a file in tmp directory
 *
 * Generates a timestamped filename and returns the absolute path.
 *
 * @param category - File category prefix (e.g., 'qr_login', 'upload-debug')
 * @param ext - File extension without dot (e.g., 'png', 'json')
 * @param user - User name (defaults to 'default')
 * @returns Absolute path to the file
 *
 * @example
 * `	ypescript
 * const filePath = getTmpFilePath('qr_login', 'png', 'alice');
 * // Returns: /path/to/users/alice/tmp/qr_login_20240405_143022.png
 * `
 */
export function getTmpFilePath(category: string, ext: string, user?: string): string {
  const fileName = category + '_' + generateTimestamp() + '.' + ext;
  return path.resolve(getTmpDir(user), fileName);
}
