/**
 * Font stealth module
 *
 * @module browser/stealth/font
 * @description Protect against font fingerprinting
 */

import type { UserFingerprint } from '../types';

/**
 * Generate font fingerprint protection script
 */
export function generateFontScript(fp: UserFingerprint): string {
  return `
// Font fingerprinting protection

(function() {
  const seed = ${fp.canvasNoiseSeed};
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const result = originalMeasureText.call(this, text);
    // Add consistent noise based on canvas seed
    result.width = result.width * (1 + (seed % 100) / 10000);
    return result;
  };
  
  // toString spoofing
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    const measureText = CanvasRenderingContext2D.prototype.measureText;
    if (measureText) measureText.toString = function() { return 'function measureText() { [native code] }'; };
  }
  
  // Font loading consistency
  if (document.fonts && document.fonts.check) {
    const originalCheck = document.fonts.check;
    document.fonts.check = function(font, text) {
      const commonFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'sans-serif', 'serif'];
      const fontFamily = font.split(',')[0].replace(/["']/g, '').trim();
      if (commonFonts.some(f => fontFamily.toLowerCase().includes(f.toLowerCase()))) {
        return true;
      }
      return originalCheck.call(this, font, text);
    };
  }
})();
`;
}

import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * font stealth module implementation
 */
export const fontModule: StealthModule = {
  name: 'font',
  enabledByDefault: true,

  generate(fp: UserFingerprint, config?: unknown): string {
    return generateFontScript(fp);
  },
};

// Auto-register module
autoRegister(fontModule);
