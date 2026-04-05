/**
 * Stealth Behavior Configuration
 *
 * @module browser/stealth-behavior
 * @description Environment-specific stealth behavior presets for anti-detection
 */

import type { EnvironmentType } from '../../user/types';
import type { StealthModuleConfig, GeolocationConfig } from './stealth/types';

export interface StealthBehaviorConfig {
  minActionDelay: number;
  maxActionDelay: number;
  minReadTime: number;
  maxReadTime: number;
  viewportRandomization: boolean;
  humanMouseMovement: boolean;
  stealthConfig: StealthModuleConfig;
  geolocation?: GeolocationConfig;
}

const GUI_NATIVE_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 500,
  maxActionDelay: 1500,
  minReadTime: 1000,
  maxReadTime: 3000,
  viewportRandomization: false,
  humanMouseMovement: true,
  stealthConfig: {
    navigator: true,
    screen: true,
    webgl: true,
    canvas: true,
    audio: true,
    chrome: true,
    webrtc: true,
    media: true,
    timezone: true,
    font: true,
    battery: true,
    geolocation: true,
    performance: true,
  },
};

const HEADLESS_SMART_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 1500,
  maxActionDelay: 3500,
  minReadTime: 2000,
  maxReadTime: 5000,
  viewportRandomization: true,
  humanMouseMovement: false,
  stealthConfig: GUI_NATIVE_BEHAVIOR.stealthConfig,
};

export function getStealthBehavior(environmentType: EnvironmentType): StealthBehaviorConfig {
  if (environmentType === 'gui-native') {
    return GUI_NATIVE_BEHAVIOR;
  }
  return HEADLESS_SMART_BEHAVIOR;
}
