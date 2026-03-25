/**
 * Migration logic for multi-user support
 *
 * @module user/migration
 * @description Migrate from single-user to multi-user structure
 */

import { copyFile, readdir, rename, stat, unlink, rmdir } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { getUsersDir, getUserDir, getUserTmpDir, saveUsersMeta } from './storage';
import type { UsersMeta } from './types';
import { debugLog } from '../utils/helpers';

// ============================================
// Constants
// ============================================

/** Old cookie file path (project root) */
const OLD_COOKIE_FILE = 'cookies.json';

/** Old tmp directory path (project root) */
const OLD_TMP_DIR = 'tmp';

/** Default user name */
const DEFAULT_USER = 'default';

// ============================================
// Migration Functions
// ============================================

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  const usersDir = getUsersDir();
  return !existsSync(usersDir);
}

/**
 * Migrate from single-user to multi-user structure
 *
 * Migration flow:
 * 1. Create users/default/ directory
 * 2. Copy cookies.json → users/default/cookies.json
 * 3. Move tmp/* → users/default/tmp/
 * 4. Create users.json with current: "default"
 * 5. Delete old cookies.json and tmp/
 */
export async function migrateToMultiUser(): Promise<void> {
  if (!isMigrationNeeded()) {
    debugLog('Migration not needed, users/ directory already exists');
    return;
  }

  debugLog('Starting migration to multi-user structure...');

  const projectRoot = process.cwd();
  const defaultUserDir = getUserDir(DEFAULT_USER);
  const defaultTmpDir = getUserTmpDir(DEFAULT_USER);

  // Step 1: Create users/default/ directory structure
  mkdirSync(defaultUserDir, { recursive: true });
  mkdirSync(defaultTmpDir, { recursive: true });
  debugLog(`Created directory: ${defaultUserDir}`);

  // Step 2: Migrate cookies.json
  const oldCookiePath = path.resolve(projectRoot, OLD_COOKIE_FILE);
  const newCookiePath = path.resolve(defaultUserDir, 'cookies.json');

  if (existsSync(oldCookiePath)) {
    await copyFile(oldCookiePath, newCookiePath);
    debugLog(`Migrated cookies.json to ${newCookiePath}`);

    // Delete old file
    await unlink(oldCookiePath);
    debugLog('Deleted old cookies.json');
  }

  // Step 3: Migrate tmp/ directory contents
  const oldTmpPath = path.resolve(projectRoot, OLD_TMP_DIR);

  if (existsSync(oldTmpPath)) {
    try {
      const entries = await readdir(oldTmpPath);

      for (const entry of entries) {
        const srcPath = path.join(oldTmpPath, entry);
        const destPath = path.join(defaultTmpDir, entry);

        try {
          const entryStat = await stat(srcPath);

          if (entryStat.isDirectory()) {
            // Move directory
            await rename(srcPath, destPath);
            debugLog(`Moved directory: ${entry}`);
          } else {
            // Move file
            await rename(srcPath, destPath);
            debugLog(`Moved file: ${entry}`);
          }
        } catch (error) {
          debugLog(`Failed to move ${entry}:`, error);
        }
      }

      // Remove empty old tmp directory
      try {
        const remaining = await readdir(oldTmpPath);
        if (remaining.length === 0) {
          await rmdir(oldTmpPath);
          debugLog('Deleted old tmp/ directory');
        }
      } catch {
        // Directory not empty or already deleted, ignore
      }
    } catch (error) {
      debugLog('Failed to migrate tmp directory:', error);
    }
  }

  // Step 4: Create users.json
  const meta: UsersMeta = {
    current: DEFAULT_USER,
    version: 1,
  };
  await saveUsersMeta(meta);
  debugLog('Created users.json');

  debugLog('Migration completed successfully');
}

/**
 * Run migration if needed (safe to call on every startup)
 */
export async function ensureMigrated(): Promise<void> {
  try {
    await migrateToMultiUser();
  } catch (error) {
    debugLog('Migration error:', error);
    // Don't throw - allow app to continue even if migration fails
  }
}
