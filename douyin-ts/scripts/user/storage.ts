/**
 * User storage operations
 *
 * @module user/storage
 * @description Directory operations and users.json management
 */

import { readdir, writeFile, mkdir, stat } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import type { UserName, UserInfo, UserListResult, UsersMeta } from './types';
import { debugLog } from '../utils/helpers';

// ============================================
// Constants
// ============================================

/** Users directory name */
const USERS_DIR = 'users';

/** Users metadata file name */
const USERS_META_FILE = 'users.json';

/** Invalid characters for user name (Windows incompatible) */
const INVALID_CHARS = /[\\/:\*?"<>|]/;

/** Default users metadata */
const DEFAULT_USERS_META: UsersMeta = {
  current: 'default',
  version: 1,
};

// ============================================
// Path Helpers
// ============================================

/**
 * Get users directory path
 */
export function getUsersDir(): string {
  return path.resolve(process.cwd(), USERS_DIR);
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
 * Get users.json path
 */
function getUsersMetaPath(): string {
  return path.resolve(getUsersDir(), USERS_META_FILE);
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
 * List all users
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

    const cookiePath = path.join(entryPath, 'cookies.json');
    users.push({
      name: entry,
      hasCookie: existsSync(cookiePath),
    });
  }

  const current = getCurrentUser();

  return {
    users,
    current,
  };
}

// ============================================
// Users Metadata Operations
// ============================================

/**
 * Load users metadata
 */
export function loadUsersMeta(): UsersMeta {
  const metaPath = getUsersMetaPath();

  if (!existsSync(metaPath)) {
    return { ...DEFAULT_USERS_META };
  }

  try {
    const content = readFileSync(metaPath, 'utf-8');
    const meta: UsersMeta = JSON.parse(content);
    return {
      ...DEFAULT_USERS_META,
      ...meta,
    };
  } catch (error) {
    debugLog('Failed to load users.json, using default:', error);
    return { ...DEFAULT_USERS_META };
  }
}

/**
 * Save users metadata
 */
export async function saveUsersMeta(meta: UsersMeta): Promise<void> {
  const usersDir = getUsersDir();

  // Ensure users directory exists
  if (!existsSync(usersDir)) {
    await mkdir(usersDir, { recursive: true });
  }

  const metaPath = getUsersMetaPath();
  await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  debugLog(`Saved users metadata to ${metaPath}`);
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
