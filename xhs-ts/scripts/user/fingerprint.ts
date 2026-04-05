/**
 * User fingerprint management
 *
 * @module user/fingerprint
 * @description Generate, store, and retrieve user-bound device fingerprints
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { UserName, UserFingerprint } from './types';
import { getUserDir } from './storage';
import { MAINSTREAM_PRESETS } from '../browser/fingerprint-presets';
import { hasDisplaySupport } from './environment';
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
// Fingerprint Generation
// ============================================

/**
 * Select preset by weight from a list
 */
function selectByWeight(): typeof MAINSTREAM_PRESETS[number] {
  const totalWeight = MAINSTREAM_PRESETS.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const preset of MAINSTREAM_PRESETS) {
    random -= preset.weight;
    if (random <= 0) {
      return preset;
    }
  }

  // Return highest weight preset as fallback
  return MAINSTREAM_PRESETS.reduce((best, p) => (p.weight > best.weight ? p : best));
}

/**
 * Generate a new fingerprint using weighted preset selection
 */
function generateFingerprint(): UserFingerprint {
  const preset = selectByWeight();

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
 * - First call: generates and saves fingerprint using weighted preset selection
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

  // Generate new fingerprint
  const fingerprint = generateFingerprint();

  // Ensure user directory exists
  const userDir = getUserDir(user);
  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true });
  }

  // Save to file
  await writeFile(fpPath, JSON.stringify(fingerprint, null, 2), 'utf-8');

  debugLog('Generated new fingerprint:', {
    description: fingerprint.description,
    platform: fingerprint.device.platform,
  });

  return fingerprint;
}
