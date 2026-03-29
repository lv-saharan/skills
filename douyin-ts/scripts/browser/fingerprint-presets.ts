/**
 * Mainstream device fingerprint presets
 *
 * @module browser/fingerprint-presets
 * @description Device fingerprint configurations loaded from config.json
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================
// Types
// ============================================

/** Device platform type */
export type DevicePlatform = 'Windows' | 'MacIntel' | 'Linux x86_64';

/** Screen resolution configuration */
export interface ScreenConfig {
  width: number;
  height: number;
  colorDepth?: 24 | 32;
}

/** Device hardware configuration */
export interface DeviceConfig {
  platform: DevicePlatform;
  hardwareConcurrency: number;
  deviceMemory: number;
}

/** WebGL configuration */
export interface WebGLConfig {
  vendor: string;
  renderer: string;
}

/** Browser configuration */
export interface BrowserConfig {
  userAgent: string;
  vendor: string;
  languages: string[];
}

/** Complete device preset */
export interface DevicePreset {
  /** Weight for random selection (percentage) */
  weight: number;
  /** Description for debugging */
  description: string;
  /** Device hardware config */
  device: DeviceConfig;
  /** WebGL config */
  webgl: WebGLConfig;
  /** Browser config */
  browser: BrowserConfig;
  /** Screen config */
  screen: ScreenConfig;
}

/** Config.json structure */
interface ConfigJson {
  devicePresets: DevicePreset[];
}

// ============================================
// Configuration Loading
// ============================================

/**
 * Load device presets from config.json
 *
 * @returns Array of device presets
 */
function loadPresetsFromConfig(): DevicePreset[] {
  try {
    const configPath = resolve(process.cwd(), 'config.json');
    const content = readFileSync(configPath, 'utf-8');
    const config: ConfigJson = JSON.parse(content);
    return config.devicePresets;
  } catch {
    console.error('[WARN] Failed to load config.json, using fallback preset');
    // Return a single fallback preset
    return [
      {
        weight: 100,
        description: 'Fallback preset (config.json not found)',
        device: {
          platform: 'Windows',
          hardwareConcurrency: 8,
          deviceMemory: 8,
        },
        webgl: {
          vendor: 'Google Inc. (Intel)',
          renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        },
        browser: {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
          vendor: 'Google Inc.',
          languages: ['zh-CN', 'zh', 'en-US', 'en'],
        },
        screen: {
          width: 1920,
          height: 1080,
          colorDepth: 24,
        },
      },
    ];
  }
}

// ============================================
// Mainstream Device Presets
// ============================================

/**
 * Mainstream device configurations for Chinese Douyin users
 *
 * Loaded from config.json for easy modification without code changes.
 *
 * Screen Resolution Distribution:
 * - 1920×1080 (FHD): ~30%
 * - 2560×1440 (QHD): ~20%
 * - 2560×1600 (Mac): ~25%
 * - 1536×864 (笔记本缩放): ~10%
 * - 3840×2160 (4K): ~10%
 * - 1440×900 (老款笔记本): ~5%
 */
export const MAINSTREAM_PRESETS: DevicePreset[] = loadPresetsFromConfig();

// ============================================
// Selection Functions
// ============================================

/**
 * Select a device preset based on weight distribution
 * @returns A device preset selected randomly by weight
 */
export function selectPresetByWeight(): DevicePreset {
  const totalWeight = MAINSTREAM_PRESETS.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const preset of MAINSTREAM_PRESETS) {
    random -= preset.weight;
    if (random <= 0) {
      return preset;
    }
  }

  // Fallback to first preset
  return MAINSTREAM_PRESETS[0];
}

/**
 * Get all available presets with their weights
 */
export function getPresetList(): Array<{ description: string; weight: number }> {
  return MAINSTREAM_PRESETS.map((p) => ({
    description: p.description,
    weight: p.weight,
  }));
}

/**
 * Get screen resolution statistics
 */
export function getScreenResolutionStats(): Map<string, number> {
  const stats = new Map<string, number>();

  for (const preset of MAINSTREAM_PRESETS) {
    const key = `${preset.screen.width}×${preset.screen.height}`;
    const current = stats.get(key) ?? 0;
    stats.set(key, current + preset.weight);
  }

  return stats;
}

/**
 * Validate a preset has all required fields
 */
export function validatePreset(preset: DevicePreset): boolean {
  return (
    typeof preset.weight === 'number' &&
    preset.weight > 0 &&
    typeof preset.description === 'string' &&
    preset.device.platform !== undefined &&
    preset.device.hardwareConcurrency > 0 &&
    preset.device.deviceMemory > 0 &&
    typeof preset.webgl.vendor === 'string' &&
    typeof preset.webgl.renderer === 'string' &&
    typeof preset.browser.userAgent === 'string' &&
    preset.screen.width > 0 &&
    preset.screen.height > 0
  );
}