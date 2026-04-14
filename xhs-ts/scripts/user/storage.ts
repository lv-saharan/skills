/**
 * User storage operations
 *
 * @module user/storage
 * @description Directory operations, users.json management, and Profile architecture
 */

import { readdir, writeFile, mkdir, stat, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type {
  UserName,
  UserInfo,
  UserListResult,
  ProfileMeta,
  ProfileStatus,
  ProfileStatusInfo,
} from './types';
import { hasDisplaySupport } from './environment';
import { getUserFingerprint } from './fingerprint';
import { debugLog } from '../core/utils';
import { buildPath } from '../core/utils/path';

// ============================================
// Constants
// ============================================

/** Users directory name */
const USERS_DIR = 'users';

/** Users metadata file name */
/** Profile metadata file name */
const PROFILE_META_FILE = 'meta.json';

/** Invalid characters for user name (Windows incompatible) */
const INVALID_CHARS = /[\\/:\*?"<>|]/;

/** Default users metadata (version 3 - simplified, no profiles) */
// ============================================
// Path Helpers
// ============================================

/**
 * Get users directory path
 */
export function getUsersDir(): string {
  return buildPath(USERS_DIR);
}

/**
 * Get user directory path
 */
export function getUserDir(user: UserName): string {
  return path.resolve(getUsersDir(), user);
}

/**
 * Get user's tmp directory path
 */
export function getUserTmpDir(user: UserName): string {
  return path.resolve(getUserDir(user), 'tmp');
}

/**
 * Get user's user-data directory path (for Playwright persistent context)
 */
export function getUserDataDir(user: UserName): string {
  return path.resolve(getUserDir(user), 'user-data');
}

/**
 * Get users.json path
 */
/**
 * Get profile meta.json path
 */
export function getProfileMetaPath(user: UserName): string {
  return path.resolve(getUserDir(user), PROFILE_META_FILE);
}

// ============================================
// User Name Validation
// ============================================

/**
 * Validate user name
 * @throws Error if user name is invalid
 */
export function validateUserName(name: UserName): void {
  if (!name || name.trim() === '') {
    throw new Error('User name cannot be empty');
  }

  if (INVALID_CHARS.test(name)) {
    throw new Error(
      `User name contains invalid characters: ${INVALID_CHARS.source}. ` +
        'Cannot use: / \\ : * ? " < > |'
    );
  }

  // Check for reserved names
  const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'lpt1', 'lpt2'];
  if (reservedNames.includes(name.toLowerCase())) {
    throw new Error(`User name "${name}" is reserved and cannot be used`);
  }
}

/**
 * Check if user name is valid (non-throwing version)
 */
export function isValidUserName(name: UserName): boolean {
  try {
    validateUserName(name);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Directory Operations
// ============================================

/**
 * Check if users directory exists
 */
export function usersDirExists(): boolean {
  return existsSync(getUsersDir());
}

/**
 * Check if user exists
 */
export function userExists(name: UserName): boolean {
  return existsSync(getUserDir(name));
}

/**
 * Create user directory structure
 */
export async function createUserDir(name: UserName): Promise<void> {
  validateUserName(name);

  const userDir = getUserDir(name);
  const tmpDir = getUserTmpDir(name);

  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true });
    debugLog(`Created user directory: ${userDir}`);
  }

  if (!existsSync(tmpDir)) {
    await mkdir(tmpDir, { recursive: true });
    debugLog(`Created user tmp directory: ${tmpDir}`);
  }
}

/**
 * Check if user has Profile (directory structure with meta.json)
 */
export function hasProfile(name: UserName): boolean {
  return existsSync(getProfileMetaPath(name));
}

/**
 * Get profile status information for a user
 */
export function getProfileStatus(name: UserName): ProfileStatusInfo {
  const userDataDir = getUserDataDir(name);
  const metaPath = getProfileMetaPath(name);

  const hasUserDataDir = existsSync(userDataDir);
  const hasMeta = existsSync(metaPath);

  const status: ProfileStatus = hasMeta ? 'full' : 'none';

  return {
    status,
    hasUserDataDir,
    hasMeta,
  };
}

/**
 * List all users with extended profile information
 */
export async function listUsers(): Promise<UserListResult> {
  const usersDir = getUsersDir();

  if (!existsSync(usersDir)) {
    return {
      users: [],
      current: 'default',
    };
  }

  const entries = await readdir(usersDir);
  const users: UserInfo[] = [];

  for (const entry of entries) {
    const entryPath = path.join(usersDir, entry);
    const entryStat = await stat(entryPath);

    // Only process directories
    if (!entryStat.isDirectory()) {
      continue;
    }

    // Skip hidden directories
    if (entry.startsWith('.')) {
      continue;
    }

    const fingerprintPath = path.join(entryPath, 'fingerprint.json');
    const profileStatus = getProfileStatus(entry);

    users.push({
      name: entry,
      hasFingerprint: existsSync(fingerprintPath),
      hasProfile: profileStatus.status === 'full',
    });
  }

  const current = (await import('./users-meta')).getCurrentUser();

  return {
    users,
    current,
  };
}

// ============================================
// Users Metadata Operations (Version 2)
// ============================================
// Profile Operations (Task 3)
// ============================================

/**
 * Create user Profile directory structure and metadata
 *
 * Creates:
 * - user-data/ directory (Playwright persistent context)
 * - tmp/ directory (temporary files)
 * - meta.json (profile metadata)
 *
 * @param user - User name
 * @param environmentType - Environment type for the profile
 * @param presetDescription - Description of preset used (optional)
 */
export async function createUserProfile(
  user: UserName,
  environmentType: string,
  presetDescription?: string
): Promise<void> {
  validateUserName(user);

  const userDir = getUserDir(user);
  const userDataDir = getUserDataDir(user);
  const tmpDir = getUserTmpDir(user);
  const metaPath = getProfileMetaPath(user);

  const now = new Date().toISOString();

  // Create directory structure
  await mkdir(userDir, { recursive: true });
  await mkdir(userDataDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  // Generate fingerprint (creates fingerprint.json)
  await getUserFingerprint(user);

  // Create profile metadata
  const meta: ProfileMeta = {
    createdAt: now,
    lastUsedAt: now,
    environmentType: environmentType as
      | 'gui-native'
      | 'gui-virtual'
      | 'headless-smart'
      | 'headless-custom',
    fingerprintSource: hasDisplaySupport() ? 'real' : 'preset',
    presetDescription,
  };

  await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  debugLog(`Created profile for user: ${user}`);

  // Note: users.json no longer stores profile data (v3)
  // All profile data is in users/{user}/profile.json
}

/**
 * Update last used timestamp for a user
 *
 * Updates the profile's meta.json only.
 * Note: users.json no longer stores profile data (v3)
 *
 * @param user - User name
 */
export async function updateLastUsed(user: UserName): Promise<void> {
  validateUserName(user);

  const metaPath = getProfileMetaPath(user);
  const now = new Date().toISOString();

  // Update profile meta.json if it exists
  if (existsSync(metaPath)) {
    try {
      const metaContent = await readFile(metaPath, 'utf-8');
      const meta: ProfileMeta = JSON.parse(metaContent);
      meta.lastUsedAt = now;
      await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
      debugLog(`Updated lastUsedAt for user: ${user}`);
    } catch (error) {
      debugLog(`Failed to update lastUsedAt for user: ${user}`, error);
    }
  }
}

// ============================================
// Cleanup Operations
// ============================================

/**
 * Clean up corrupted user data directory
 *
 * Removes the user-data directory (Playwright persistent context).
 * This forces a fresh login on next launch.
 *
 * @param user - User name
 * @param fullCleanup - If true, also removes entire user directory (including fingerprint, profile)
 * @returns Path that was cleaned up
 */
export async function cleanupUserData(user: UserName, fullCleanup = false): Promise<string> {
  validateUserName(user);

  const userDataDir = getUserDataDir(user);
  const userDir = getUserDir(user);

  const targetPath = fullCleanup ? userDir : userDataDir;

  if (!existsSync(targetPath)) {
    debugLog('No directory to clean up for user: ' + user);
    return targetPath;
  }

  // Use fs/promises rm for recursive deletion
  const { rm } = await import('fs/promises');
  await rm(targetPath, { recursive: true, force: true });

  debugLog('Cleaned up user data for user: ' + user + ' at ' + targetPath);

  return targetPath;
}

/**
 * Check if user data cleanup is safe to perform
 *
 * Verifies that:
 * - User directory exists
 * - No browser process is running for this user
 *
 * @param user - User name
 * @returns true if cleanup is safe, false otherwise
 */
export async function canCleanupUserData(user: UserName): Promise<boolean> {
  if (!userExists(user)) {
    return false;
  }

  // Check if browser is running for this user
  // Import dynamically to avoid circular dependency
  const { hasBrowserInstance } = await import('../actions/shared/browser-launcher');
  const isRunning = await hasBrowserInstance(user);

  if (isRunning) {
    debugLog('Browser is running for user: ' + user + ', cleanup not safe');
    return false;
  }

  return true;
}
