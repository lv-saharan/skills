/**
 * Stealth Script Generator
 *
 * @module core/browser/stealth/generator
 * @description Generates stealth injection scripts using module registry
 */

import type { UserFingerprint, StealthModuleConfig, GeolocationConfig } from './types';
import { stealthRegistry } from './registry';
import { combineScripts, getIframeFixScript, getSourceURLScript } from './utils';
import { DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION } from './constants';

/**
 * Generate complete stealth injection script with user-bound fingerprint
 *
 * Uses the stealth module registry to dynamically generate scripts
 * based on enabled modules.
 *
 * @param fp - User's device fingerprint configuration
 * @param config - Optional module configuration (default: all enabled)
 * @param geolocation - Optional geolocation config (default: Shanghai)
 * @returns JavaScript code to inject into browser context
 */
export function generateStealthScript(
  fp: UserFingerprint,
  config: StealthModuleConfig = DEFAULT_STEALTH_CONFIG,
  geolocation?: GeolocationConfig
): string {
  // Get enabled modules from registry
  const enabledModules = stealthRegistry.getEnabled(config);

  // Generate scripts from enabled modules
  const scripts: string[] = enabledModules.map((module) => {
    // Special handling for geolocation module which needs config
    if (module.name === 'geolocation') {
      const geoConfig = geolocation || DEFAULT_GEOLOCATION;
      return module.generate(fp, geoConfig);
    }
    return module.generate(fp, config);
  });

  // Always add iframe fix and sourceURL hiding
  scripts.push(getIframeFixScript());
  scripts.push(getSourceURLScript());

  return combineScripts(...scripts);
}
