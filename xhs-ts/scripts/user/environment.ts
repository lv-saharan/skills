/**
 * Environment detection module
 *
 * @module user/environment
 * @description Detect device environment and generate environment-aware fingerprints
 */

import os from 'os';
import type { DevicePlatform } from '../browser/fingerprint-presets';
import {
  MAINSTREAM_PRESETS,
  selectPresetByWeight,
  type DevicePreset,
} from '../browser/fingerprint-presets';
import type {
  EnvironmentType,
  UserEnvironment,
  DeviceProfile,
} from './types';
import { debugLog } from '../utils/helpers';

// ============================================
// Environment Detection
// ============================================

/**
 * Check if the current environment supports a graphical display
 *
 * @returns true if GUI is available, false for headless/server environments
 */
export function hasDisplaySupport(): boolean {
  const platform = process.platform;

  // Linux: check for DISPLAY or WAYLAND_DISPLAY
  if (platform === 'linux') {
    return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  }

  // Windows and macOS typically have display support
  return true;
}

/**
 * Detect current device characteristics
 *
 * Uses Node.js APIs to get real device info for smart preset matching.
 */
export function detectDeviceProfile(): DeviceProfile {
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

/**
 * Detect the environment type
 *
 * @returns Environment type based on display support and other factors
 */
export function detectEnvironmentType(): EnvironmentType {
  if (hasDisplaySupport()) {
    return 'gui-native';
  }

  // No display - use headless-smart by default
  return 'headless-smart';
}

/**
 * Detect full environment information
 *
 * @returns Complete environment information for fingerprint generation
 */
export function detectEnvironment(): UserEnvironment {
  const type = detectEnvironmentType();
  const deviceProfile = detectDeviceProfile();

  // Determine fingerprint source based on environment type
  let fingerprintSource: 'preset' | 'real' | 'custom';
  let presetDescription: string | undefined;

  switch (type) {
    case 'gui-native':
      fingerprintSource = 'real';
      break;
    case 'gui-virtual':
      fingerprintSource = 'real';
      break;
    case 'headless-smart':
      fingerprintSource = 'preset';
      presetDescription = getMostMainstreamPresetInfo().description;
      break;
    case 'headless-custom':
      fingerprintSource = 'preset';
      break;
  }

  return {
    type,
    fingerprintSource,
    device: deviceProfile,
    presetDescription,
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
 * Get the most mainstream preset info
 */
export function getMostMainstreamPresetInfo(): {
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
export function selectPresetBySmartMatch(): DevicePreset {
  const profile = detectDeviceProfile();

  debugLog('Detecting preset for device profile:', profile);

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
 * Generate a fingerprint based on current environment
 *
 * For gui-native/gui-virtual: generates fingerprint matching real device
 * For headless-smart: selects preset based on smart matching
 * For headless-custom: uses provided preset
 */
export function generateEnvironmentFingerprint(preset?: DevicePreset): {
  platform: DevicePlatform;
  hardwareConcurrency: number;
  deviceMemory: number;
  userAgent: string;
  vendor: string;
  languages: string[];
  webglVendor: string;
  webglRenderer: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: 24 | 32;
  canvasNoiseSeed: number;
  audioNoiseSeed: number;
  presetDescription?: string;
} {
  let selectedPreset: DevicePreset;

  if (preset) {
    selectedPreset = preset;
  } else {
    const env = detectEnvironment();

    switch (env.type) {
      case 'gui-native':
      case 'gui-virtual':
        // For GUI, try to detect real device first, then fall back to smart matching
        selectedPreset = selectPresetBySmartMatch();
        break;
      case 'headless-smart':
      case 'headless-custom':
      default:
        selectedPreset = selectPresetBySmartMatch();
        break;
    }
  }

  return {
    platform: selectedPreset.device.platform,
    hardwareConcurrency: selectedPreset.device.hardwareConcurrency,
    deviceMemory: selectedPreset.device.deviceMemory,
    userAgent: selectedPreset.browser.userAgent,
    vendor: selectedPreset.browser.vendor,
    languages: [...selectedPreset.browser.languages],
    webglVendor: selectedPreset.webgl.vendor,
    webglRenderer: selectedPreset.webgl.renderer,
    screenWidth: selectedPreset.screen.width,
    screenHeight: selectedPreset.screen.height,
    colorDepth: selectedPreset.screen.colorDepth ?? 24,
    canvasNoiseSeed: Math.floor(Math.random() * 10000000),
    audioNoiseSeed: Math.floor(Math.random() * 10000000),
    presetDescription: selectedPreset.description,
  };
}

/**
 * Main entry point: generate fingerprint based on current environment
 *
 * This function is the primary API for environment-aware fingerprint generation.
 * It automatically detects the environment type and generates appropriate fingerprints.
 */
export function generateFingerprint(): {
  platform: DevicePlatform;
  hardwareConcurrency: number;
  deviceMemory: number;
  userAgent: string;
  vendor: string;
  languages: string[];
  webglVendor: string;
  webglRenderer: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: 24 | 32;
  canvasNoiseSeed: number;
  audioNoiseSeed: number;
  presetDescription?: string;
} {
  return generateEnvironmentFingerprint();
}
