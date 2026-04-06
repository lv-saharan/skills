/**
 * CLI Utilities
 *
 * @module cli/utils
 * @description Utility functions for CLI option parsing
 */

/**
 * Parse number option with default value
 */
export function parseNumberOption(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Resolve headless mode
 */
export function resolveHeadless(explicitValue: boolean | undefined, configValue: boolean): boolean {
  return explicitValue !== undefined ? explicitValue : configValue;
}

/**
 * Parse boolean flag
 */
export function resolveBoolFlag(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value !== 'false';
}