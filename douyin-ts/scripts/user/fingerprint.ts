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
// NOTE: path resolution handled by core/utils (buildPath)
import {
  loadDevicePresets,
  selectPresetByWeight,
  generateFingerprintFromPreset,
} from '../core/fingerprint';
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
// Fingerprint Generation
// ============================================

/**
 * Generate a new fingerprint using weighted preset selection
 */
async function generateFingerprint(): Promise<UserFingerprint> {
  const presets = await loadDevicePresets();
  const preset = selectPresetByWeight(presets);
  if (!preset) {
    throw new Error('No presets available');
  }
  return generateFingerprintFromPreset(preset);
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
  const fingerprint = await generateFingerprint();

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
