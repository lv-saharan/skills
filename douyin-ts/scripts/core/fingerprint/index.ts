/**
 * Fingerprint module entry
 *
 * @module core/fingerprint
 * @description Device fingerprint generation (platform-agnostic)
 */

export { loadDevicePresets, selectPresetByWeight, generateFingerprintFromPreset } from './presets';
export type {
  DevicePreset,
  UserFingerprint,
  DeviceConfig,
  ScreenConfig,
  WebGLConfig,
  BrowserConfig,
  DevicePlatform,
} from './types';
