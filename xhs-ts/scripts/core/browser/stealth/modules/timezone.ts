import type { UserFingerprint } from '../types';
/**
 * Timezone stealth module
 *
 * @module browser/stealth/timezone
 * @description Ensure timezone consistency across APIs
 */

/**
 * Generate timezone consistency script
 */
export function generateTimezoneScript(): string {
  return `
// Timezone/Intl consistency (Asia/Shanghai = UTC+8)

(function() {
  const timeZone = 'Asia/Shanghai';
  
  // Intl.DateTimeFormat
  const OriginalDateTimeFormat = Intl.DateTimeFormat;
  Intl.DateTimeFormat = function() {
    const instance = new OriginalDateTimeFormat(...arguments);
    const originalResolvedOptions = instance.resolvedOptions.bind(instance);
    instance.resolvedOptions = function() {
      const options = originalResolvedOptions();
      options.timeZone = timeZone;
      return options;
    };
    return instance;
  };
  Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
  Intl.DateTimeFormat.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf;
  
  // Date.getTimezoneOffset consistency (UTC+8 = -480 minutes)
  Date.prototype.getTimezoneOffset = function() { return -480; };
})();
`;
}

import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * timezone stealth module implementation
 */
export const timezoneModule: StealthModule = {
  name: 'timezone',
  enabledByDefault: true,

  generate(_fp: UserFingerprint, _config?: unknown): string {
    return generateTimezoneScript();
  },
};

// Auto-register module
autoRegister(timezoneModule);
