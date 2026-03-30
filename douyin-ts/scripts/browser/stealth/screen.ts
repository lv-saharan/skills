/**
 * Screen stealth module
 *
 * @module browser/stealth/screen
 * @description Spoof screen properties and CSS media queries
 */

import type { UserFingerprint } from './types';

/**
 * Generate screen stealth script
 */
export function generateScreenScript(fp: UserFingerprint): string {
  return `
// Screen properties spoofing

Object.defineProperty(screen, 'width', { get: () => ${fp.screen.width}, configurable: true });
Object.defineProperty(screen, 'height', { get: () => ${fp.screen.height}, configurable: true });
Object.defineProperty(screen, 'availWidth', { get: () => ${fp.screen.width}, configurable: true });
Object.defineProperty(screen, 'availHeight', { get: () => ${fp.screen.height} - 40, configurable: true });
Object.defineProperty(screen, 'colorDepth', { get: () => ${fp.screen.colorDepth}, configurable: true });
Object.defineProperty(screen, 'pixelDepth', { get: () => ${fp.screen.colorDepth}, configurable: true });

// Screen orientation
(function() {
  const isLandscape = ${fp.screen.width} > ${fp.screen.height};
  Object.defineProperty(screen, 'orientation', {
    get: () => ({
      type: isLandscape ? 'landscape-primary' : 'portrait-primary',
      angle: 0,
      onchange: null,
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; }
    }),
    configurable: true
  });
  Object.defineProperty(screen, 'availLeft', { get: () => 0, configurable: true });
  Object.defineProperty(screen, 'availTop', { get: () => 0, configurable: true });
})();

// Window dimensions
try {
  if (window.outerWidth === 0) {
    Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth, configurable: true });
  }
  if (window.outerHeight === 0) {
    Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 100, configurable: true });
  }
} catch (e) {}

// devicePixelRatio (standard display = 1)
Object.defineProperty(window, 'devicePixelRatio', { get: () => 1, configurable: true });

// CSS Media Queries consistency
(function() {
  const width = ${fp.screen.width};
  const height = ${fp.screen.height};
  const isLandscape = width > height;
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = function(query) {
    const result = originalMatchMedia.call(window, query);
    if (query.includes('orientation')) {
      Object.defineProperty(result, 'matches', { 
        value: isLandscape ? query.includes('landscape') : query.includes('portrait'), 
        configurable: true 
      });
    }
    if (query.includes('prefers-color-scheme')) {
      Object.defineProperty(result, 'matches', { value: query.includes('light'), configurable: true });
    }
    if (query.includes('prefers-reduced-motion')) {
      Object.defineProperty(result, 'matches', { value: false, configurable: true });
    }
    if (query.includes('hover')) {
      Object.defineProperty(result, 'matches', { value: true, configurable: true });
    }
    if (query.includes('pointer')) {
      Object.defineProperty(result, 'matches', { value: query.includes('fine'), configurable: true });
    }
    return result;
  };
})();
`;
}
