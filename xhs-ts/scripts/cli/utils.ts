/**
 * CLI utility functions
 *
 * @module cli/utils
 * @description Helper functions for CLI command option parsing
 */

// ============================================
// Number Parsing
// ============================================

/**
 * Parse number option with default value
 */
export function parseNumberOption(value: string | undefined, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

// ============================================
// Option Resolution
// ============================================

/**
 * Resolve headless option: CLI override > config default
 */
export function resolveHeadless(cliValue: boolean | undefined, configDefault: boolean): boolean {
  return cliValue ?? configDefault;
}

/**
 * Resolve boolean flag: true if flag is present
 */
export function resolveBoolFlag(value: boolean | undefined, defaultValue = false): boolean {
  return value ?? defaultValue;
}
