/**
 * Mainstream device fingerprint presets
 *
 * @module browser/fingerprint-presets
 * @description Device fingerprint configurations loaded from config.json
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type {
  DevicePlatform,
  ScreenConfig,
  DeviceConfig,
  WebGLConfig,
  BrowserConfig,
} from '../../user/types';

// Re-export types for convenience
export type { DevicePlatform, ScreenConfig, DeviceConfig, WebGLConfig, BrowserConfig };

// ============================================
// Device Preset Type
// ============================================

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
          platform: 'Windows' as DevicePlatform,
          hardwareConcurrency: 8,
          deviceMemory: 8,
        },
        webgl: {
          vendor: 'Google Inc. (Intel)',
          renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        },
        browser: {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          vendor: 'Google Inc.',
          languages: ['zh-CN', 'en', 'en-GB', 'en-US'],
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
 * Mainstream device configurations for Chinese Xiaohongshu users
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
