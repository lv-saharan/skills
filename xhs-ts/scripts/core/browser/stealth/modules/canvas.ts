/**
 * Canvas stealth module
 *
 * @module browser/stealth/canvas
 * @description Add noise to canvas fingerprint
 */

import type { UserFingerprint } from '../types';

/**
 * Generate Canvas fingerprint noise script
 */
export function generateCanvasScript(fp: UserFingerprint): string {
  return `
// Canvas fingerprint noise (seed: ${fp.canvasNoiseSeed})

(function() {
  const seed = ${fp.canvasNoiseSeed};
  const noise = (x) => ((Math.sin(x * seed) * 10000) % 256) / 256000;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    const context = this.getContext('2d');
    if (context && this.width > 0 && this.height > 0) {
      try {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise(i)));
          imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise(i + 1)));
          imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise(i + 2)));
        }
        context.putImageData(imageData, 0, 0);
      } catch (e) { /* ignore canvas noise errors */ }
    }
    return originalToDataURL.apply(this, arguments);
  };
  
  // toString spoofing
  if (typeof HTMLCanvasElement !== 'undefined') {
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    if (toDataURL) toDataURL.toString = function() { return 'function toDataURL() { [native code] }'; };
  }
})();
`;
}

import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * canvas stealth module implementation
 */
export const canvasModule: StealthModule = {
  name: 'canvas',
  enabledByDefault: true,

  generate(fp: UserFingerprint, _config?: unknown): string {
    return generateCanvasScript(fp);
  },
};

// Auto-register module
autoRegister(canvasModule);
