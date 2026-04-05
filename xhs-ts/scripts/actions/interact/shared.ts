/**
 * Interact module shared utilities (Re-export for backward compatibility)
 *
 * @module interact/shared
 * @deprecated Import from 'actions/shared' instead. This file is kept for backward compatibility.
 *
 * The actual implementation has been moved to actions/shared/session.ts
 * to provide a unified API for all Xiaohongshu actions.
 */

// ============================================
// Re-export from the new location
// ============================================

export {
  // Session API
  withAuthenticatedAction,
  type AuthenticatedActionOptions,

  // Page Utilities
  navigateTo,
  checkPageHealth,
  preparePageForAction,

  // Batch Operations
  executeBatch,
  type BatchOptions,

  // Constants
  INTERACTION_DELAYS,
} from '../shared/session';

// ============================================
// Additional exports for interact module
// ============================================

import type { StealthBehaviorConfig } from '../../core/browser';
import { delays } from '../../config/loader';

/**
 * Get interaction delays from behavior config
 * @param behavior - Stealth behavior configuration
 * @returns Delay presets for interactions
 */
export function getInteractionDelays(behavior?: StealthBehaviorConfig): {
  afterNavigation: { mean: number; stdDev: number };
  afterClick: { mean: number; stdDev: number };
  batchInterval: { mean: number; stdDev: number };
} {
  if (!behavior) {
    return delays;
  }

  return {
    afterNavigation: {
      mean: behavior.minReadTime + (behavior.maxReadTime - behavior.minReadTime) / 2,
      stdDev: (behavior.maxReadTime - behavior.minReadTime) / 4,
    },
    afterClick: {
      mean: behavior.minActionDelay + (behavior.maxActionDelay - behavior.minActionDelay) / 2,
      stdDev: (behavior.maxActionDelay - behavior.minActionDelay) / 4,
    },
    batchInterval: {
      mean: behavior.minActionDelay + (behavior.maxActionDelay - behavior.minActionDelay) / 2,
      stdDev: (behavior.maxActionDelay - behavior.minActionDelay) / 4,
    },
  };
}

/**
 * Delay preset interface (for backward compatibility)
 */
export interface InteractionDelayPreset {
  mean: number;
  stdDev: number;
}
