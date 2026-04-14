/**
 * Fingerprint presets loader
 *
 * @module core/fingerprint/presets
 * @description Load and select device presets (platform-agnostic)
 */

import type { DevicePreset, UserFingerprint } from './types';
import { buildPath } from '../utils';

/**
 * Load device presets from config file
 *
 * @param configPath - Path to config.json (default: auto-resolved via buildPath)
 * @returns Device presets array
 */
export async function loadDevicePresets(configPath?: string): Promise<DevicePreset[]> {
  const fs = await import('fs/promises');
  const filePath = configPath || buildPath('config.json');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content) as {
      presets?: DevicePreset[];
      devicePresets?: DevicePreset[];
    };
    // Support both 'presets' and 'devicePresets' keys
    return config.presets || config.devicePresets || [];
  } catch (error) {
    console.warn('Failed to load device presets:', error);
    return [];
  }
}

/**
 * Select a preset by weight (random weighted selection)
 *
 * @param presets - Device presets array
 * @returns Selected preset or undefined if empty
 */
export function selectPresetByWeight(presets: DevicePreset[]): DevicePreset | undefined {
  if (presets.length === 0) {
    return undefined;
  }

  const totalWeight = presets.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const preset of presets) {
    random -= preset.weight;
    if (random <= 0) {
      return preset;
    }
  }

  return presets[presets.length - 1];
}

/**
 * Generate user fingerprint from preset
 *
 * @param preset - Device preset
 * @returns User fingerprint
 */
export function generateFingerprintFromPreset(preset: DevicePreset): UserFingerprint {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    device: preset.device,
    browser: preset.browser,
    webgl: preset.webgl,
    screen: preset.screen,
    canvasNoiseSeed: Math.floor(Math.random() * 1000000),
    audioNoiseSeed: Math.floor(Math.random() * 1000000),
    description: preset.description,
  };
}
