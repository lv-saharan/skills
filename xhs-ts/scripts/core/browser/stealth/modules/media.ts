import type { UserFingerprint } from '../types';
/**
 * Media stealth module
 *
 * @module browser/stealth/media
 * @description Mock media devices and codecs
 */

/**
 * Generate media stealth script
 */
export function generateMediaScript(): string {
  return `
// Media codecs support

const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
HTMLMediaElement.prototype.canPlayType = function(type) {
  if (!type) return '';
  // Chrome supports these codecs with 'probably'
  if (type.includes('avc1') || type.includes('mp4a') || type.includes('aac')) return 'probably';
  if (type.includes('vp8') || type.includes('vp9') || type.includes('opus')) return 'probably';
  if (type.includes('mpeg') || type.includes('mp3')) return 'probably';
  return originalCanPlayType.call(this, type);
};

// toString spoofing
if (typeof HTMLMediaElement !== 'undefined') {
  const canPlayType = HTMLMediaElement.prototype.canPlayType;
  if (canPlayType) canPlayType.toString = function() { return 'function canPlayType() { [native code] }'; };
}

// MediaDevices mock
if (navigator.mediaDevices) {
  navigator.mediaDevices.enumerateDevices = function() {
    return Promise.resolve([
      { deviceId: 'default', kind: 'audioinput', label: '', groupId: 'default' },
      { deviceId: 'default', kind: 'audiooutput', label: '', groupId: 'default' }
    ]);
  };
}

// Notification permission consistency
try {
  if (typeof Notification !== 'undefined') {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'default',
      configurable: true
    });
  }
} catch (e) { /* ignore notification permission errors */ }
`;
}

import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * media stealth module implementation
 */
export const mediaModule: StealthModule = {
  name: 'media',
  enabledByDefault: true,

  generate(_fp: UserFingerprint, _config?: unknown): string {
    return generateMediaScript();
  },
};

// Auto-register module
autoRegister(mediaModule);
