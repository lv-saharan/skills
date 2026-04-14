/**
 * Stealth module types
 *
 * @module browser/stealth/types
 * @description Type definitions for stealth injection scripts
 */

import type { UserFingerprint } from '../../fingerprint/types';
import type { StealthModuleConfig } from '../types';

// ============================================
// Stealth Module Interface
// ============================================

/**
 * Stealth module generator interface
 *
 * All stealth modules must implement this interface
 */
export interface StealthModule {
  /** Module name for configuration (must match config key) */
  name: string;
  /** Default enabled state */
  enabledByDefault: boolean;
  /** Generate stealth injection script */
  generate(fingerprint: UserFingerprint, config?: unknown): string;
}

/**
 * Stealth module registry interface
 */
export interface StealthModuleRegistry {
  /** Register a stealth module */
  register(module: StealthModule): void;
  /** Get module by name */
  get(name: string): StealthModule | undefined;
  /** Get all registered modules */
  getAll(): StealthModule[];
  /** Get enabled modules based on config */
  getEnabled(config: StealthModuleConfig): StealthModule[];
}

// ============================================
// Re-exports (from unified types)
// ============================================

// Re-export shared types from parent types.ts
export type { StealthModuleConfig, GeolocationConfig } from '../types';

// Re-export UserFingerprint for convenience
export type { UserFingerprint };
