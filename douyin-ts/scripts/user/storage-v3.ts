/**
 * Unified Profile Storage (v3)
 *
 * @module user/storage-v3
 * @description Unified storage API for user profiles and browser connections
 *
 * This module provides a single-file storage structure for user data:
 * - users/{user}/profile.json contains both profile metadata and browser connection info
 *
 * Replaces the previous two-file structure:
 * - users/{user}/meta.json (Profile metadata)
 * - users/{user}/connections/meta.json (browser connection info)
 */

import { readFile, writeFile, mkdir, unlink, rename } from 'fs/promises';
import { existsSync, rmdirSync } from 'fs';
import path from 'path';
import type {
  UserName,
  UserProfileData,
  ProfileMeta,
  ConnectionInfo,
  EnvironmentType,
} from './types';
import { validateUserName } from './storage';
import { getUserDir, getUserDataDir } from './storage';
import { hasDisplaySupport, detectEnvironmentType } from './environment';
import { getUserFingerprint } from './fingerprint';
import { debugLog } from '../core/utils';

// ============================================
// Constants
// ============================================

/** Profile data file name (new unified structure) */
const PROFILE_DATA_FILE = 'profile.json';

/** Legacy profile meta file name */
const LEGACY_META_FILE = 'meta.json';

/** Legacy connection file path */
const LEGACY_CONNECTION_PATH = 'connections/meta.json';

// ============================================
// Path Helpers
// ============================================

/**
 * Get profile.json path (new unified structure)
 */
export function getProfilePath(user: UserName): string {
  return path.join(getUserDir(user), PROFILE_DATA_FILE);
}

/**
 * Get legacy meta.json path
 */
export function getLegacyMetaPath(user: UserName): string {
  return path.join(getUserDir(user), LEGACY_META_FILE);
}

/**
 * Get legacy connections/meta.json path
 */
function getLegacyConnectionPath(user: UserName): string {
  return path.join(getUserDir(user), LEGACY_CONNECTION_PATH);
}

// ============================================
// Profile Data Operations (v3)
// ============================================

/**
 * Load user profile data (unified structure)
 *
 * Automatically migrates from legacy format if needed.
 *
 * @param user - User name
 * @returns User profile data or null if not exists
 */
export async function loadUserProfileData(user: UserName): Promise<UserProfileData | null> {
  validateUserName(user);

  const profilePath = getProfilePath(user);

  // New format exists - return directly
  if (existsSync(profilePath)) {
    try {
      const content = await readFile(profilePath, 'utf-8');
      return JSON.parse(content) as UserProfileData;
    } catch (error) {
      debugLog(`Failed to load profile.json for user: ${user}`, error);
      return null;
    }
  }

  // Check for legacy format and migrate
  const legacyMetaPath = getLegacyMetaPath(user);
  if (existsSync(legacyMetaPath)) {
    debugLog(`Migrating legacy profile to v3 for user: ${user}`);
    return await migrateLegacyProfile(user);
  }

  return null;
}

/**
 * Save user profile data (unified structure)
 *
 * Uses atomic write pattern for data integrity.
 *
 * @param user - User name
 * @param data - Profile data to save
 */
export async function saveUserProfileData(user: UserName, data: UserProfileData): Promise<void> {
  validateUserName(user);

  const profilePath = getProfilePath(user);
  const tempPath = profilePath + '.tmp';

  // Ensure directory exists
  const userDir = getUserDir(user);
  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true });
  }

  // Write to temp file first (atomic write pattern)
  await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');

  try {
    await rename(tempPath, profilePath);
    debugLog(`Saved profile.json for user: ${user}`);
  } catch {
    try {
      await unlink(profilePath);
      await rename(tempPath, profilePath);
      debugLog(`Saved profile.json for user: ${user}`);
    } catch (fallbackError) {
      try {
        await unlink(tempPath);
      } catch {}
      throw fallbackError;
    }
  }
}

/**
 * Create new user profile
 *
 * Creates profile.json with initial metadata.
 *
 * @param user - User name
 * @param environmentType - Environment type
 * @param presetDescription - Optional preset description
 */
export async function createUserProfileData(
  user: UserName,
  environmentType: EnvironmentType,
  presetDescription?: string
): Promise<UserProfileData> {
  validateUserName(user);

  const now = new Date().toISOString();

  const meta: ProfileMeta = {
    createdAt: now,
    lastUsedAt: now,
    environmentType,
    fingerprintSource: hasDisplaySupport() ? 'real' : 'preset',
    presetDescription,
  };

  const data: UserProfileData = {
    version: 1,
    meta,
  };

  // Ensure user directory structure
  const userDir = getUserDir(user);
  const userDataDir = getUserDataDir(user);

  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true });
  }
  if (!existsSync(userDataDir)) {
    await mkdir(userDataDir, { recursive: true });
  }

  // Generate fingerprint
  await getUserFingerprint(user);

  // Save profile data
  await saveUserProfileData(user, data);

  return data;
}

/**
 * Check if user has profile (v3 format or legacy)
 */
export function hasProfileData(user: UserName): boolean {
  return existsSync(getProfilePath(user)) || existsSync(getLegacyMetaPath(user));
}

// ============================================
// Connection Operations
// ============================================

/**
 * Load connection info from profile data
 *
 * @param user - User name
 * @returns Connection info or null
 */
export async function loadConnectionInfo(user: UserName): Promise<ConnectionInfo | null> {
  const data = await loadUserProfileData(user);
  return data?.connection ?? null;
}

/**
 * Save connection info to profile data
 *
 * @param user - User name
 * @param info - Connection info to save
 */
export async function saveConnectionInfo(user: UserName, info: ConnectionInfo): Promise<void> {
  let data = await loadUserProfileData(user);

  if (!data) {
    // Create new profile if not exists
    data = await createUserProfileData(user, detectEnvironmentType());
  }

  data.connection = info;
  await saveUserProfileData(user, data);
  debugLog(`Saved connection info for user: ${user}`, { port: info.port });
}

/**
 * Clear connection info from profile data
 *
 * @param user - User name
 */
export async function clearConnectionInfo(user: UserName): Promise<void> {
  const data = await loadUserProfileData(user);

  if (data && data.connection) {
    delete data.connection;
    await saveUserProfileData(user, data);
    debugLog(`Cleared connection info for user: ${user}`);
  }
}

/**
 * Update connection activity timestamp
 *
 * @param user - User name
 */
export async function updateConnectionActivity(user: UserName): Promise<void> {
  const data = await loadUserProfileData(user);

  if (data?.connection) {
    data.connection.lastActivityAt = new Date().toISOString();
    await saveUserProfileData(user, data);
  }
}

// ============================================
// Profile Metadata Operations
// ============================================

/**
 * Update profile last used timestamp
 *
 * @param user - User name
 */
export async function updateProfileLastUsed(user: UserName): Promise<void> {
  const data = await loadUserProfileData(user);

  if (data) {
    data.meta.lastUsedAt = new Date().toISOString();
    await saveUserProfileData(user, data);
    debugLog(`Updated lastUsedAt for user: ${user}`);
  }
}

// ============================================
// Migration
// ============================================

/**
 * Migrate legacy profile format to v3
 *
 * Migrates from:
 * - users/{user}/meta.json
 * - users/{user}/connections/meta.json
 *
 * To:
 * - users/{user}/profile.json
 *
 * @param user - User name
 * @returns Migrated profile data
 */
async function migrateLegacyProfile(user: UserName): Promise<UserProfileData> {
  const legacyMetaPath = getLegacyMetaPath(user);
  const legacyConnPath = getLegacyConnectionPath(user);

  // Load legacy meta.json
  let meta: ProfileMeta;
  if (existsSync(legacyMetaPath)) {
    const content = await readFile(legacyMetaPath, 'utf-8');
    const legacyMeta = JSON.parse(content) as ProfileMeta;
    meta = {
      createdAt: legacyMeta.createdAt || new Date().toISOString(),
      lastUsedAt: legacyMeta.lastUsedAt || new Date().toISOString(),
      environmentType: legacyMeta.environmentType || 'gui-native',
      fingerprintSource: legacyMeta.fingerprintSource || 'preset',
      presetDescription: legacyMeta.presetDescription,
    };
  } else {
    meta = {
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      environmentType: detectEnvironmentType(),
      fingerprintSource: hasDisplaySupport() ? 'real' : 'preset',
    };
  }

  // Load legacy connections/meta.json
  let connection: ConnectionInfo | undefined;
  if (existsSync(legacyConnPath)) {
    try {
      const content = await readFile(legacyConnPath, 'utf-8');
      const legacyConn = JSON.parse(content) as ConnectionInfo;
      connection = {
        port: legacyConn.port,
        pid: legacyConn.pid,
        wsEndpoint: legacyConn.wsEndpoint,
        startedAt: legacyConn.startedAt || new Date().toISOString(),
        lastActivityAt: legacyConn.lastActivityAt || new Date().toISOString(),
      };
    } catch (error) {
      debugLog(`Failed to load legacy connection for user: ${user}`, error);
    }
  }

  // Create new unified profile data
  const data: UserProfileData = {
    version: 1,
    meta,
    connection,
  };

  // Save new format
  await saveUserProfileData(user, data);

  // Cleanup legacy files
  try {
    if (existsSync(legacyMetaPath)) {
      await unlink(legacyMetaPath);
    }
    if (existsSync(legacyConnPath)) {
      await unlink(legacyConnPath);
    }
    // Remove empty connections directory
    const connDir = path.dirname(legacyConnPath);
    if (existsSync(connDir)) {
      try {
        rmdirSync(connDir);
      } catch {
        // Directory not empty, ignore
      }
    }
    debugLog(`Migrated profile to v3 for user: ${user}`);
  } catch (error) {
    debugLog(`Warning: Failed to cleanup legacy files for user: ${user}`, error);
  }

  return data;
}
