/**
 * Stealth Module Registry
 *
 * @module core/browser/stealth/registry
 * @description Centralized registry for stealth module management
 */

import type { StealthModule, StealthModuleRegistry, StealthModuleConfig } from './types';

// ============================================
// Default Registry Implementation
// ============================================

/**
 * Default stealth module registry implementation
 *
 * Features:
 * - Module registration and retrieval
 * - Enabled/disabled filtering based on config
 * - Module enumeration
 */
class DefaultStealthModuleRegistry implements StealthModuleRegistry {
  /** Registered modules map */
  private modules = new Map<string, StealthModule>();

  /**
   * Register a stealth module
   * @param module - Module to register
   */
  register(module: StealthModule): void {
    if (this.modules.has(module.name)) {
      // Allow re-registration (useful for hot-reload in development)
      // console.warn disabled in production - `[StealthRegistry] Module '${module.name}' already registered, overwriting`);
    }
    this.modules.set(module.name, module);
  }

  /**
   * Get module by name
   * @param name - Module name
   * @returns Module or undefined if not found
   */
  get(name: string): StealthModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Get all registered modules
   * @returns Array of all modules
   */
  getAll(): StealthModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get enabled modules based on configuration
   * @param config - Stealth module configuration
   * @returns Array of enabled modules
   */
  getEnabled(config: StealthModuleConfig): StealthModule[] {
    return this.getAll().filter((module) => {
      const configValue = config[module.name as keyof StealthModuleConfig];
      // Explicit false disables, everything else (including undefined) uses default
      return configValue !== false;
    });
  }

  /**
   * Check if a module is registered
   * @param name - Module name
   * @returns True if module is registered
   */
  has(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Get count of registered modules
   * @returns Number of registered modules
   */
  count(): number {
    return this.modules.size;
  }

  /**
   * Clear all registered modules (useful for testing)
   */
  clear(): void {
    this.modules.clear();
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * Global stealth module registry instance
 *
 * Usage:
 * ```typescript
 * import { stealthRegistry } from './registry';
 * import { navigatorModule } from './modules/navigator';
 *
 * // Register module (auto-registration also available)
 * stealthRegistry.register(navigatorModule);
 *
 * // Get enabled modules
 * const enabled = stealthRegistry.getEnabled(config);
 * ```
 */
export const stealthRegistry = new DefaultStealthModuleRegistry();

// ============================================
// Helper Functions
// ============================================

/**
 * Auto-register a module if not already registered
 * @param module - Module to register
 */
export function autoRegister(module: StealthModule): void {
  if (!stealthRegistry.has(module.name)) {
    stealthRegistry.register(module);
  }
}
