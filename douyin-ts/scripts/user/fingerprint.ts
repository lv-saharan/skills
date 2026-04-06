/**
 * User fingerprint management
 *
 * @module user/fingerprint
 * @description Generate, store, and retrieve user-bound device fingerprints
 */

import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { UserName, UserFingerprint } from './types';
import { getUserDir } from './storage';
import {
  selectPresetBySmartMatch,
  getMostMainstreamPreset,
  hasDisplaySupport,
  detectScreenResolution,
} from './environment';
import { debugLog } from '../core/utils';

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
// Smart Preset Selection
// ============================================

/**
 * Get the most mainstream preset (highest weight)
 * Re-exported from environment module for backward compatibility
 */
export { getMostMainstreamPreset } from './environment';

// ============================================
// Fingerprint Generation
// ============================================

/**
 * Generate a new fingerprint using smart device matching
 *
 * Screen resolution priority:
 * 1. Real detected screen (if display available and detection succeeds)
 * 2. Preset screen (fallback)
 *
 * Note: Screen detection only happens at fingerprint creation time.
 * Once saved, the fingerprint is used consistently regardless of
 * headless/gui mode.
 */
function generateFingerprintFromPreset(): UserFingerprint {
  const preset = selectPresetBySmartMatch();

  // Detect real screen resolution (only if display available)
  // This ensures consistent fingerprint across headless/gui modes
  let screenWidth = preset.screen.width;
  let screenHeight = preset.screen.height;
  let description = preset.description;

  if (hasDisplaySupport()) {
    const detectedScreen = detectScreenResolution();
    if (detectedScreen) {
      screenWidth = detectedScreen.width;
      screenHeight = detectedScreen.height;
      description = `${preset.description} + 真实屏幕 ${detectedScreen.width}x${detectedScreen.height}`;
      debugLog(`Using detected screen: ${screenWidth}x${screenHeight}`);
    } else {
      debugLog('Screen detection failed, using preset screen');
    }
  } else {
    debugLog('No display support, using preset screen');
  }

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
      width: screenWidth,
      height: screenHeight,
      colorDepth: preset.screen.colorDepth ?? 24,
    },
    canvasNoiseSeed: Math.floor(Math.random() * 10000000),
    audioNoiseSeed: Math.floor(Math.random() * 10000000),
    description,
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
        debugLog('Loaded existing fingerprint for user:', user);
        return fingerprint;
      }

      // Version mismatch - regenerate
      debugLog('Fingerprint version mismatch, regenerating');
    } catch (error) {
      debugLog('Failed to load fingerprint:', error);
    }
  }

  // Generate new fingerprint with smart device matching
  const fingerprint = generateFingerprintFromPreset();

  // Save to file
  await saveUserFingerprint(user, fingerprint);

  debugLog('Generated new fingerprint:', {
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
  debugLog();
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

  debugLog();

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
    screen: `${preset.screen.width}x${preset.screen.height}`,
  };
}

