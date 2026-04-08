/**
 * CLI utility functions
 *
 * @module cli/utils
 * @description Helper functions for CLI command option parsing and validation
 */

import { outputError } from '../core/utils/output';
import { SkillErrorCode } from '../config';

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

// ============================================
// Validation
// ============================================

/**
 * Validate that URLs array is not empty
 * Outputs error and exits process if validation fails.
 */
export function validateUrls(urls: string[] | undefined, errorMsg: string): void {
  if (!urls?.length) {
    outputError(errorMsg, SkillErrorCode.NOT_FOUND);
    process.exit(1);
  }
}

// ============================================
// Error Handling
// ============================================

/**
 * Convert unknown error to message and output
 * Standardized error output for CLI command handlers.
 */
export function outputFromError(
  error: unknown,
  code: (typeof SkillErrorCode)[keyof typeof SkillErrorCode] = SkillErrorCode.BROWSER_ERROR
): void {
  const message = error instanceof Error ? error.message : String(error);
  outputError(message, code);
}
