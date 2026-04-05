/**
 * User profile loader
 *
 * @module user/profile-loader
 * @description Load and parse user profile data
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import type {
  UserName,
  UserProfile,
  ProfileMeta,
  UserEnvironment,
  UserFingerprint,
  GeolocationConfig,
} from './types';
import { getUserDir, getUserDataDir, validateUserName } from './storage';
import { getProfilePath, getLegacyMetaPath } from './storage-v3';

/**
 * Create default fingerprint for legacy users
 */
function createDefaultFingerprint(): UserFingerprint {
  return {
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
      languages: ['zh-CN', 'en', 'en-GB', 'en-US'],
    },
    webgl: {
      vendor: 'Google Inc.',
      renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)',
    },
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
    },
    canvasNoiseSeed: Math.floor(Math.random() * 10000000),
    audioNoiseSeed: Math.floor(Math.random() * 10000000),
  };
}

/**
 * Load user profile
 *
 * Supports both v3 (profile.json) and legacy (meta.json) formats.
 *
 * @param user - User name
 * @returns User profile data
 * @throws Error if profile doesn't exist
 */
export async function loadUserProfile(user: UserName): Promise<UserProfile> {
  validateUserName(user);

  const userDir = getUserDir(user);
  const userDataDir = getUserDataDir(user);
  const profilePath = getProfilePath(user);
  const legacyMetaPath = getLegacyMetaPath(user);
  const fingerprintPath = path.join(userDir, 'fingerprint.json');

  let meta: ProfileMeta;
  let userGeolocation: GeolocationConfig | undefined;

  // Try v3 format first (profile.json)
  if (existsSync(profilePath)) {
    const content = await readFile(profilePath, 'utf-8');
    const data = JSON.parse(content) as { meta: ProfileMeta; geolocation?: GeolocationConfig };
    meta = data.meta;
    userGeolocation = data.geolocation;
  }
  // Fall back to legacy format (meta.json)
  else if (existsSync(legacyMetaPath)) {
    const content = await readFile(legacyMetaPath, 'utf-8');
    const data = JSON.parse(content) as ProfileMeta & { version?: number };
    // Extract meta without version field (if present)
    meta = {
      createdAt: data.createdAt,
      lastUsedAt: data.lastUsedAt,
      environmentType: data.environmentType,
      fingerprintSource: data.fingerprintSource,
      presetDescription: data.presetDescription,
    };
  } else {
    throw new Error(`Profile does not exist for user: ${user}`);
  }

  // Load fingerprint
  let fingerprint: UserFingerprint;
  if (existsSync(fingerprintPath)) {
    const fingerprintContent = await readFile(fingerprintPath, 'utf-8');
    fingerprint = JSON.parse(fingerprintContent) as UserFingerprint;
  } else {
    fingerprint = createDefaultFingerprint();
  }

  // Build environment
  const environment: UserEnvironment = {
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
    geolocation: userGeolocation,
  };
}
