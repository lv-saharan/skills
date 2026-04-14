import type { UserFingerprint } from '../types';
/**
 * Performance stealth module
 *
 * @module browser/stealth/performance
 * @description Ensure performance API consistency
 */

/**
 * Generate Performance API consistency script
 */
export function generatePerformanceScript(): string {
  return `
// Performance API consistency

(function() {
  // Ensure monotonic time
  let lastNow = performance.now();
  const originalNow = performance.now;
  performance.now = function() {
    const currentNow = originalNow.call(performance);
    if (currentNow < lastNow) {
      return lastNow;
    }
    lastNow = currentNow;
    return currentNow;
  };

  // timeOrigin consistency
  try {
    Object.defineProperty(performance, 'timeOrigin', {
      get: () => Date.now() - Math.floor(originalNow.call(performance)),
      configurable: true
    });
  } catch (e) { /* ignore performance API errors */ }

  // Memory API mock (Chrome only)
  if ('memory' in performance) {
    try {
      Object.defineProperty(performance, 'memory', {
        get: () => ({
          totalJSHeapSize: 50000000 + Math.floor(Math.random() * 10000000),
          usedJSHeapSize: 30000000 + Math.floor(Math.random() * 10000000),
          jsHeapSizeLimit: 2000000000
        }),
        configurable: true
      });
    } catch (e) { /* ignore performance API errors */ }
  }
})();
`;
}

import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * performance stealth module implementation
 */
export const performanceModule: StealthModule = {
  name: 'performance',
  enabledByDefault: true,

  generate(_fp: UserFingerprint, _config?: unknown): string {
    return generatePerformanceScript();
  },
};

// Auto-register module
autoRegister(performanceModule);
