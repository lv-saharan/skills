/**
 * User storage operations
 *
 * @module user/storage
 * @description Directory operations, users.json management, and Profile architecture
 */

import { readdir, writeFile, mkdir, stat, readFile, rename, unlink } from 'fs/promises';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  UserName,
  UserInfo,
  UserListResult,
  UsersMeta,
  UserProfile,
  UserMeta,
  ProfileStatus,
  ProfileStatusInfo,
} from './types';
import { hasDisplaySupport, detectEnvironmentType } from './environment';
import { getUserFingerprint } from './fingerprint';
import { debugLog } from '../utils/helpers';

// ============================================
// Constants
// ============================================

/** Users directory name */
const USERS_DIR = 'users';

/** Users metadata file name */
const USERS_META_FILE = 'users.json';

/** Profile metadata file name */
const PROFILE_META_FILE = 'meta.json';

/** Invalid characters for user name (Windows incompatible) */
const INVALID_CHARS = /[\\/:\*?"<>|]/;

/** Default users metadata (version 2 - Profile architecture) */
const DEFAULT_USERS_META_V2: UsersMeta = {
  current: 'default',
  version: 2,
  profiles: {},
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
 * Get user's user-data directory path (for Playwright persistent context)
 */
export function getUserDataDir(user: UserName): string {
  return path.resolve(getUserDir(user), 'user-data');
}

/**
 * Get users.json path
 */
function getUsersMetaPath(): string {
  return path.resolve(getUsersDir(), USERS_META_FILE);
}

/**
 * Get profile meta.json path
 */
function getProfileMetaPath(user: UserName): string {
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

  const current = getCurrentUser();

  return {
    users,
    current,
  };
}

// ============================================
// Users Metadata Operations (Version 2)
// ============================================

/**
 * Load users metadata with version migration support
 *
 * Automatically migrates from version 1 to version 2 if needed.
 */
export function loadUsersMeta(): UsersMeta {
  const metaPath = getUsersMetaPath();

  if (!existsSync(metaPath)) {
    return { ...DEFAULT_USERS_META_V2 };
  }

  try {
    const content = readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(content) as { version?: number; [key: string]: unknown };

    // Version 1 -> 2 migration
    if (meta.version === 1) {
      debugLog('Migrating users.json from version 1 to version 2...');

      const migratedMeta: UsersMeta = {
        ...DEFAULT_USERS_META_V2,
        current: (meta.current as UserName) || 'default',
        profiles: {}, // Initialize empty profiles
      };

      // Scan existing users and add profile refs
      if (existsSync(getUsersDir())) {
        const entries = readdirSync(getUsersDir());
        for (const entry of entries) {
          const entryPath = path.join(getUsersDir(), entry);
          const entryStat = statSync(entryPath);
          if (entryStat.isDirectory() && !entry.startsWith('.')) {
            migratedMeta.profiles![entry] = {
              createdAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
              environmentType: detectEnvironmentType(),
            };
          }
        }
      }

      // Save migrated version synchronously
      try {
        writeFileSync(metaPath, JSON.stringify(migratedMeta, null, 2), 'utf-8');
        debugLog('Migrated users.json to version 2');
      } catch (writeError) {
        debugLog('Failed to save migrated users.json:', writeError);
      }

      return migratedMeta;
    }

    // Already version 2 or higher
    return {
      ...DEFAULT_USERS_META_V2,
      ...meta,
    };
  } catch (error) {
    debugLog('Failed to load users.json, using default:', error);
    return { ...DEFAULT_USERS_META_V2 };
  }
}

/**
 * Load users metadata asynchronously with version migration support
 *
 * Automatically migrates from version 1 to version 2 if needed.
 * Use this instead of loadUsersMeta() to avoid race conditions.
 */
export async function loadUsersMetaAsync(): Promise<UsersMeta> {
  const metaPath = getUsersMetaPath();

  if (!existsSync(metaPath)) {
    return { ...DEFAULT_USERS_META_V2 };
  }

  try {
    const content = await readFile(metaPath, 'utf-8');
    const meta = JSON.parse(content) as { version?: number; [key: string]: unknown };

    if (meta.version === 1) {
      debugLog('Migrating users.json from version 1 to version 2...');

      const migratedMeta: UsersMeta = {
        ...DEFAULT_USERS_META_V2,
        current: (meta.current as UserName) || 'default',
        profiles: {},
      };

      if (existsSync(getUsersDir())) {
        const entries = await readdir(getUsersDir());
        for (const entry of entries) {
          const entryPath = path.join(getUsersDir(), entry);
          const entryStat = await stat(entryPath);
          if (entryStat.isDirectory() && !entry.startsWith('.')) {
            migratedMeta.profiles![entry] = {
              createdAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
              environmentType: detectEnvironmentType(),
            };
          }
        }
      }

      await saveUsersMeta(migratedMeta);
      debugLog('Migrated users.json to version 2');

      return migratedMeta;
    }

    return { ...DEFAULT_USERS_META_V2, ...meta };
  } catch (error) {
    debugLog('Failed to load users.json, using default:', error);
    return { ...DEFAULT_USERS_META_V2 };
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
      } catch {}
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
 * Get current user name asynchronously
 */
export async function getCurrentUserAsync(): Promise<UserName> {
  const meta = await loadUsersMetaAsync();
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

  // Ensure profiles record exists
  if (!meta.profiles) {
    meta.profiles = {};
  }

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

/**
 * Resolve user name asynchronously
 */
export async function resolveUserAsync(explicitUser?: UserName): Promise<UserName> {
  if (explicitUser) {
    return explicitUser;
  }
  return getCurrentUserAsync();
}

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
  const meta: UserMeta = {
    version: 1,
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

  // Update users.json profiles reference
  const usersMeta = loadUsersMeta();
  if (!usersMeta.profiles) {
    usersMeta.profiles = {};
  }
  usersMeta.profiles[user] = {
    createdAt: now,
    lastUsedAt: now,
    environmentType: environmentType as
      | 'gui-native'
      | 'gui-virtual'
      | 'headless-smart'
      | 'headless-custom',
  };
  await saveUsersMeta(usersMeta);
}

/**
 * Load user Profile
 *
 * Loads complete profile data including metadata and fingerprint.
 *
 * @param user - User name
 * @returns User profile data
 * @throws Error if profile doesn't exist
 */
export async function loadUserProfile(user: UserName): Promise<UserProfile> {
  validateUserName(user);

  const userDir = getUserDir(user);
  const userDataDir = getUserDataDir(user);
  const metaPath = getProfileMetaPath(user);
  const fingerprintPath = path.join(userDir, 'fingerprint.json');

  // Check if profile exists
  if (!existsSync(metaPath)) {
    throw new Error(`Profile does not exist for user: ${user}`);
  }

  // Load profile metadata
  const metaContent = await readFile(metaPath, 'utf-8');
  const meta: UserMeta = JSON.parse(metaContent);

  // Load fingerprint (optional - may not exist for legacy users)
  let fingerprint;
  if (existsSync(fingerprintPath)) {
    const fingerprintContent = await readFile(fingerprintPath, 'utf-8');
    fingerprint = JSON.parse(fingerprintContent);
  } else {
    // Generate default fingerprint for legacy users
    fingerprint = {
      version: 1,
      createdAt: new Date().toISOString(),
      device: {
        platform: 'Windows',
        hardwareConcurrency: 8,
        deviceMemory: 8,
      },
      browser: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        vendor: 'Google Inc.',
        languages: ['zh-CN', 'zh', 'en-US', 'en'],
      },
      webgl: {
        vendor: 'Google Inc.',
        renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)',
      },
      screen: {
        width: 1920,
        height: 1080,
        colorDepth: 24 as const,
      },
      canvasNoiseSeed: Math.floor(Math.random() * 10000000),
      audioNoiseSeed: Math.floor(Math.random() * 10000000),
    };
  }

  // Determine environment from meta
  const environment = {
    type: meta.environmentType,
    fingerprintSource: meta.fingerprintSource,
    device: {
      platform: fingerprint.device.platform,
      hardwareConcurrency: fingerprint.device.hardwareConcurrency,
      deviceMemory: fingerprint.device.deviceMemory,
    },
    presetDescription: meta.presetDescription,
  };

  return {
    meta,
    fingerprint,
    environment,
    userDataDir,
  };
}

/**
 * Update last used timestamp for a user
 *
 * Updates both the profile's meta.json and the users.json profiles reference.
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
      const meta: UserMeta = JSON.parse(metaContent);
      meta.lastUsedAt = now;
      await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
      debugLog(`Updated lastUsedAt for user: ${user}`);
    } catch (error) {
      debugLog(`Failed to update lastUsedAt for user: ${user}`, error);
    }
  }

  // Update users.json profiles reference
  const usersMeta = loadUsersMeta();
  if (usersMeta.profiles && usersMeta.profiles[user]) {
    usersMeta.profiles[user].lastUsedAt = now;
    await saveUsersMeta(usersMeta);
  }
}
