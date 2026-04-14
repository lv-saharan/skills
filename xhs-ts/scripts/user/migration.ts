/**
 * Migration logic for multi-user support
 *
 * @module user/migration
 * @description Migrate from single-user to multi-user structure
 */

import { copyFile, readdir, rename, stat, unlink, rmdir } from 'fs/promises';
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { getUsersDir, getUserDir, getUserTmpDir } from './storage';
import { saveUsersMeta } from './users-meta';
import type { UsersMeta } from './types';
import { debugLog } from '../core/utils';
import { SKILL_ROOT } from '../core/utils/path';

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
// Backup Functions
// ============================================

/**
 * Backup cookies.json before migration
 * Creates cookies.json.backup in the same directory
 */
async function backupCookies(userDir: string): Promise<string | null> {
  const cookiePath = path.resolve(userDir, 'cookies.json');
  const backupPath = path.resolve(userDir, 'cookies.json.backup');

  if (existsSync(cookiePath)) {
    try {
      await copyFile(cookiePath, backupPath);
      debugLog(`Backed up cookies.json to ${backupPath}`);
      return backupPath;
    } catch (error) {
      debugLog(`Failed to backup cookies.json:`, error);
    }
  }
  return null;
}

// ============================================
// Migration Functions
// ============================================

/**
 * Check if migration is needed
 * Returns true if:
 * - users/ directory doesn't exist (v1 → v2)
 * - users.json version < 2 (v1)
 * - users/{user}/user-data/ doesn't exist (v2 without profile)
 * - users.json is corrupted/invalid JSON
 */
export function isMigrationNeeded(): boolean {
  const usersDir = getUsersDir();

  // Check if users directory exists
  if (!existsSync(usersDir)) {
    return true;
  }

  // Validate users.json BEFORE calling loadUsersMeta()
  // loadUsersMeta() catches errors and returns defaults, so we need to
  // manually validate the JSON to detect corrupted files
  const usersJsonPath = path.resolve(getUsersDir(), 'users.json');
  if (existsSync(usersJsonPath)) {
    try {
      const content = readFileSync(usersJsonPath, 'utf-8');
      const parsed = JSON.parse(content) as { version?: number; [key: string]: unknown };

      // Check version BEFORE loadUsersMeta() because it auto-migrates v1 to v2
      if (typeof parsed.version !== 'number' || parsed.version < 2) {
        return true;
      }
    } catch {
      // JSON is corrupted - migration needed to rebuild
      return true;
    }
  }

  // Try to read users.json synchronously (isMigrationNeeded is sync)
  try {
    const usersJsonPath = path.resolve(getUsersDir(), 'users.json');
    if (!existsSync(usersJsonPath)) {
      return true;
    }
    const content = readFileSync(usersJsonPath, 'utf-8');
    const usersMeta = JSON.parse(content) as UsersMeta;

    // Check version
    if (usersMeta.version < 2) {
      return true;
    }

    // Check if each user has profile structure
    for (const userName of Object.keys(usersMeta.profiles || {})) {
      const userDir = getUserDir(userName);
      const userDataDir = path.resolve(userDir, 'user-data');
      const metaPath = path.resolve(userDir, 'meta.json');

      if (!existsSync(userDataDir) || !existsSync(metaPath)) {
        return true;
      }
    }

    return false;
  } catch {
    // Can't read users.json, migration needed
    return true;
  }
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

  const projectRoot = SKILL_ROOT;
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
    // Backup before migration
    await backupCookies(defaultUserDir);

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

  // Step 4: Create users.json (version 2 - Profile architecture)
  const meta: UsersMeta = {
    current: DEFAULT_USER,
    version: 2,
    profiles: {
      [DEFAULT_USER]: {
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        environmentType: 'gui-native',
      },
    },
  };
  await saveUsersMeta(meta);
  debugLog('Created users.json');

  debugLog('Migration completed successfully');
}

/**
 * Migrate existing users to Profile architecture
 * Creates user-data/ and meta.json for each user
 *
 * Note: In version 3, profiles field is removed from users.json.
 * This function scans the users/ directory directly to find user directories.
 */
export async function migrateToProfile(): Promise<void> {
  const usersDir = getUsersDir();

  if (!existsSync(usersDir)) {
    debugLog('No users directory, skipping profile migration');
    return;
  }

  try {
    // Scan users/ directory for user directories
    // (Version 3 removed profiles field from users.json, so we scan directly)
    const entries = await readdir(usersDir);
    const userDirectories = entries.filter((entry) => {
      const entryPath = path.join(usersDir, entry);
      // Filter out files (like users.json) and include only directories
      return existsSync(entryPath) && statSync(entryPath).isDirectory();
    });

    debugLog(`Found ${userDirectories.length} user directories to migrate`);

    // Migrate each user directory to Profile structure
    for (const userName of userDirectories) {
      const userDir = getUserDir(userName);
      const userDataDir = path.resolve(userDir, 'user-data');
      const metaPath = path.resolve(userDir, 'meta.json');

      // Create backup before migration
      await backupCookies(userDir);

      // Create user-data directory
      if (!existsSync(userDataDir)) {
        mkdirSync(userDataDir, { recursive: true });
        debugLog(`Created user-data directory for ${userName}`);
      }

      // Create meta.json if missing
      if (!existsSync(metaPath)) {
        const meta = {
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          environmentType: 'gui-native',
          version: 1,
        };
        await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
        debugLog(`Created meta.json for ${userName}`);
      }
    }

    debugLog('Profile migration completed');
  } catch (error) {
    debugLog('Profile migration error:', error);
    throw error;
  }
}

// Helper for writing files
import { writeFile } from 'fs/promises';

/**
 * Run all migrations if needed (safe to call on every startup)
 * Runs in order:
 * 1. migrateToMultiUser (v1 → v2)
 * 2. migrateToProfile (v2 → Profile architecture)
 */
export async function ensureMigrated(): Promise<void> {
  const migrationErrors: Error[] = [];

  try {
    // First migration: single-user → multi-user
    await migrateToMultiUser();
  } catch (error) {
    migrationErrors.push(error instanceof Error ? error : new Error(String(error)));
    debugLog('Multi-user migration error:', error);
  }

  try {
    // Second migration: multi-user → profile
    await migrateToProfile();
  } catch (error) {
    migrationErrors.push(error instanceof Error ? error : new Error(String(error)));
    debugLog('Profile migration error:', error);
  }

  // Log summary of migration issues (but don't throw to allow app to continue)
  if (migrationErrors.length > 0) {
    console.warn('[Migration] Completed with ' + migrationErrors.length + ' warning(s):');
    for (const err of migrationErrors) {
      console.warn('  - ' + err.message);
    }
    console.warn(
      '[Migration] Application will continue, but some features may not work correctly.'
    );
  }
}
