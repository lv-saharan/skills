/**
 * User fingerprint management
 *
 * @module user/fingerprint
 * @description Generate, store, and retrieve user-bound device fingerprints
 */

import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import type { UserName, UserFingerprint } from './types';
import { getUserDir } from './storage';
import {
  MAINSTREAM_PRESETS,
  type DevicePreset,
  type DevicePlatform,
} from '../browser/fingerprint-presets';
import { debugLog } from '../utils/helpers';

// ============================================
// Constants
// ============================================

/** Fingerprint storage file name */
const FINGERPRINT_FILE = 'fingerprint.json';

// ============================================
// Path Helpers
// ============================================

/**
 * Get fingerprint file path for a user
 */
function getFingerprintPath(user: UserName): string {
  return path.join(getUserDir(user), FINGERPRINT_FILE);
}

// ============================================
// Device Detection
// ============================================

/**
 * Detected device profile
 */
interface DeviceProfile {
  platform: DevicePlatform;
  hardwareConcurrency: number;
  deviceMemory: number;
}

/**
 * Detect current device characteristics
 *
 * Uses Node.js APIs to get real device info for smart preset matching.
 */
function detectDeviceProfile(): DeviceProfile {
  // Detect platform
  let platform: DevicePlatform;
  switch (process.platform) {
    case 'darwin':
      platform = 'MacIntel';
      break;
    case 'linux':
      platform = 'Linux x86_64';
      break;
    default:
      platform = 'Windows';
  }

  // Detect CPU cores
  const hardwareConcurrency = os.cpus().length;

  // Detect memory (in GB, rounded to common values)
  const totalGB = os.totalmem() / (1024 * 1024 * 1024);
  const deviceMemory = totalGB >= 30 ? 32 : totalGB >= 14 ? 16 : totalGB >= 6 ? 8 : 4;

  return {
    platform,
    hardwareConcurrency,
    deviceMemory,
  };
}

// ============================================
// Smart Preset Selection
// ============================================

/**
 * Select preset by weight from a list
 */
function selectByWeight(presets: DevicePreset[]): DevicePreset {
  const totalWeight = presets.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const preset of presets) {
    random -= preset.weight;
    if (random <= 0) {
      return preset;
    }
  }

  return presets[0];
}

/**
 * Get the most mainstream preset (highest weight)
 */
export function getMostMainstreamPreset(): DevicePreset {
  return MAINSTREAM_PRESETS.reduce((best, p) => (p.weight > best.weight ? p : best));
}

/**
 * Select preset by smart device matching
 *
 * Strategy:
 * 1. Detect current device characteristics
 * 2. Filter presets by platform match
 * 3. Further filter by hardware proximity (optional)
 * 4. Select by weight from matched presets
 * 5. Fallback to most mainstream preset
 */
function selectPresetByDeviceMatch(): DevicePreset {
  const profile = detectDeviceProfile();

  debugLog('Detected device profile:', profile);

  // Step 1: Filter by platform
  const platformMatched = MAINSTREAM_PRESETS.filter((p) => p.device.platform === profile.platform);

  if (platformMatched.length === 0) {
    // No platform match, use most mainstream
    debugLog('No platform match, using most mainstream preset');
    return getMostMainstreamPreset();
  }

  // Step 2: Try to match hardware characteristics (soft match)
  // Find presets with similar CPU cores (±4) and memory (±8)
  const hardwareMatched = platformMatched.filter((p) => {
    const cpuDiff = Math.abs(p.device.hardwareConcurrency - profile.hardwareConcurrency);
    const memDiff = Math.abs(p.device.deviceMemory - profile.deviceMemory);
    return cpuDiff <= 4 && memDiff <= 8;
  });

  if (hardwareMatched.length > 0) {
    debugLog(
      `Found ${hardwareMatched.length} hardware-matched presets from ${platformMatched.length} platform-matched`
    );
    return selectByWeight(hardwareMatched);
  }

  // Step 3: Use platform-matched presets
  debugLog(`Using ${platformMatched.length} platform-matched presets (no hardware match)`);
  return selectByWeight(platformMatched);
}

// ============================================
// Fingerprint Generation
// ============================================

/**
 * Generate a new fingerprint using smart device matching
 */
function generateFingerprintFromPreset(): UserFingerprint {
  const preset = selectPresetByDeviceMatch();

  const fingerprint: UserFingerprint = {
    version: 1,
    createdAt: new Date().toISOString(),
    device: {
      platform: preset.device.platform,
      hardwareConcurrency: preset.device.hardwareConcurrency,
      deviceMemory: preset.device.deviceMemory,
    },
    browser: {
      userAgent: preset.browser.userAgent,
      vendor: preset.browser.vendor,
      languages: [...preset.browser.languages],
    },
    webgl: {
      vendor: preset.webgl.vendor,
      renderer: preset.webgl.renderer,
    },
    screen: {
      width: preset.screen.width,
      height: preset.screen.height,
      colorDepth: preset.screen.colorDepth ?? 24,
    },
    canvasNoiseSeed: Math.floor(Math.random() * 10000000),
    audioNoiseSeed: Math.floor(Math.random() * 10000000),
    description: preset.description,
  };

  return fingerprint;
}

// ============================================
// Public API
// ============================================

/**
 * Get user fingerprint (generate if not exists)
 *
 * This function ensures each user has a consistent fingerprint:
 * - First call: generates and saves fingerprint using smart device matching
 * - Subsequent calls: returns saved fingerprint
 *
 * @param user - User name
 * @returns User's device fingerprint
 */
export async function getUserFingerprint(user: UserName): Promise<UserFingerprint> {
  const fpPath = getFingerprintPath(user);

  // Load existing fingerprint
  if (existsSync(fpPath)) {
    try {
      const content = await readFile(fpPath, 'utf-8');
      const fingerprint: UserFingerprint = JSON.parse(content);

      // Validate version
      if (fingerprint.version === 1) {
        debugLog(`Loaded existing fingerprint for user: ${user}`);
        return fingerprint;
      }

      // Version mismatch - regenerate
      debugLog(`Fingerprint version mismatch for user: ${user}, regenerating...`);
    } catch (error) {
      debugLog(`Failed to load fingerprint for user: ${user}, regenerating...`, error);
    }
  }

  // Generate new fingerprint with smart device matching
  const fingerprint = generateFingerprintFromPreset();

  // Save to file
  await saveUserFingerprint(user, fingerprint);

  debugLog(`Generated new fingerprint for user: ${user}`, {
    description: fingerprint.description,
    platform: fingerprint.device.platform,
  });

  return fingerprint;
}

/**
 * Save user fingerprint to file
 */
export async function saveUserFingerprint(
  user: UserName,
  fingerprint: UserFingerprint
): Promise<void> {
  const fpPath = getFingerprintPath(user);

  // Ensure user directory exists
  const userDir = getUserDir(user);
  if (!existsSync(userDir)) {
    const { mkdir } = await import('fs/promises');
    await mkdir(userDir, { recursive: true });
  }

  await writeFile(fpPath, JSON.stringify(fingerprint, null, 2), 'utf-8');
  debugLog(`Saved fingerprint to: ${fpPath}`);
}

/**
 * Check if user has fingerprint configured
 */
export function hasUserFingerprint(user: UserName): boolean {
  return existsSync(getFingerprintPath(user));
}

/**
 * Regenerate user fingerprint
 *
 * Use with caution - changing fingerprint may trigger security alerts
 */
export async function regenerateUserFingerprint(user: UserName): Promise<UserFingerprint> {
  const fingerprint = generateFingerprintFromPreset();
  await saveUserFingerprint(user, fingerprint);

  debugLog(`Regenerated fingerprint for user: ${user}`);

  return fingerprint;
}

/**
 * Get fingerprint info for display (without sensitive details)
 */
export function getFingerprintInfo(fingerprint: UserFingerprint): {
  description: string | undefined;
  platform: string;
  createdAt: string;
} {
  return {
    description: fingerprint.description,
    platform: fingerprint.device.platform,
    createdAt: fingerprint.createdAt,
  };
}

/**
 * Get the most mainstream preset info (for default fallback)
 */
export function getDefaultPresetInfo(): {
  description: string;
  platform: string;
  screen: string;
} {
  const preset = getMostMainstreamPreset();
  return {
    description: preset.description,
    platform: preset.device.platform,
    screen: `${preset.screen.width}×${preset.screen.height}`,
  };
}