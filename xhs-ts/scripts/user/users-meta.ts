/**
 * Users metadata management
 *
 * @module user/users-meta
 * @description Manage users.json for multi-user tracking
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { mkdir, writeFile, rename, unlink } from 'fs/promises';
import path from 'path';
import type { UserName, UsersMeta } from './types';
import { getUsersDir, validateUserName, userExists, createUserDir } from './storage';
import { debugLog } from '../core/utils';

// ============================================
// Constants
// ============================================

/** Users metadata file name */
const USERS_META_FILE = 'users.json';

/** Default users metadata (version 3 - simplified, no profiles) */
const DEFAULT_USERS_META_V3: UsersMeta = {
  current: 'default',
  version: 3,
};

// ============================================
// Path Helpers
// ============================================

/**
 * Get users.json path
 */
function getUsersMetaPath(): string {
  return path.resolve(getUsersDir(), USERS_META_FILE);
}

// ============================================
// Users Metadata Operations
// ============================================

/**
 * Load users metadata with version migration support
 *
 * Automatically migrates from version 1/2 to version 3 if needed.
 * Version 3 removes the profiles field - all profile data is in users/{user}/profile.json
 */
export function loadUsersMeta(): UsersMeta {
  const metaPath = getUsersMetaPath();

  if (!existsSync(metaPath)) {
    return { ...DEFAULT_USERS_META_V3 };
  }

  try {
    const content = readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(content) as { version?: number; current?: UserName };

    // Version 1 or 2 -> 3 migration (simplify: remove profiles)
    if (!meta.version || meta.version < 3) {
      debugLog(`Migrating users.json from version ${meta.version || 1} to version 3...`);

      const migratedMeta: UsersMeta = {
        current: meta.current || 'default',
        version: 3,
      };

      // Save migrated version synchronously
      try {
        writeFileSync(metaPath, JSON.stringify(migratedMeta, null, 2), 'utf-8');
        debugLog('Migrated users.json to version 3 (removed profiles field)');
      } catch (writeError) {
        debugLog('Failed to save migrated users.json:', writeError);
      }

      return migratedMeta;
    }

    // Already version 3 or higher
    return {
      ...DEFAULT_USERS_META_V3,
      ...meta,
    };
  } catch (error) {
    debugLog('Failed to load users.json, using default:', error);
    return { ...DEFAULT_USERS_META_V3 };
  }
}

/**
 * Save users metadata with atomic write
 *
 * Uses atomic write pattern: write to temp file, then rename.
 * This prevents data corruption from concurrent writes.
 */
export async function saveUsersMeta(meta: UsersMeta): Promise<void> {
  const usersDir = getUsersDir();

  if (!existsSync(usersDir)) {
    await mkdir(usersDir, { recursive: true });
  }

  const metaPath = getUsersMetaPath();
  const tempPath = metaPath + '.tmp';

  await writeFile(tempPath, JSON.stringify(meta, null, 2), 'utf-8');

  try {
    await rename(tempPath, metaPath);
    debugLog('Saved users metadata to ' + metaPath);
  } catch {
    try {
      await unlink(metaPath);
      await rename(tempPath, metaPath);
      debugLog('Saved users metadata to ' + metaPath);
    } catch (fallbackError) {
      try {
        await unlink(tempPath);
      } catch {
        /* ignore */
      }
      throw fallbackError;
    }
  }
}

/**
 * Get current user name
 */
export function getCurrentUser(): UserName {
  const meta = loadUsersMeta();
  return meta.current || 'default';
}

/**
 * Set current user
 */
export async function setCurrentUser(name: UserName): Promise<void> {
  validateUserName(name);

  // Create user directory if not exists
  if (!userExists(name)) {
    await createUserDir(name);
  }

  const meta = loadUsersMeta();
  meta.current = name;

  await saveUsersMeta(meta);

  debugLog(`Set current user to: ${name}`);
}

/**
 * Clear current user (reset to default)
 */
export async function clearCurrentUser(): Promise<void> {
  const meta = loadUsersMeta();
  meta.current = 'default';
  await saveUsersMeta(meta);

  debugLog('Cleared current user, reset to default');
}

// ============================================
// User Resolution
// ============================================

/**
 * Resolve user name with priority:
 * 1. Explicit user parameter (from --user option)
 * 2. Current user from users.json
 * 3. Default user
 */
export function resolveUser(explicitUser?: UserName): UserName {
  if (explicitUser) {
    return explicitUser;
  }
  return getCurrentUser();
}
