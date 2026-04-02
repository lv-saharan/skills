/**
 * User profile loader
 *
 * @module user/profile-loader
 * @description Load and parse user profile data
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import type { UserName, UserProfile, UserMeta, UserEnvironment, UserFingerprint } from './types';
import { getUserDir, getUserDataDir, getProfileMetaPath, validateUserName } from './storage';

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
      languages: ['zh-CN', 'zh', 'en-US', 'en'],
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
  const meta = JSON.parse(metaContent) as UserMeta;

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
  };
}
