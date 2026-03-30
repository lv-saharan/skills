/**
 * Stealth utilities
 *
 * @module browser/stealth/utils
 * @description Utility functions for stealth scripts
 */

/**
 * Polyfill script for __name
 */
export function getPolyfillScript(): string {
  return `
// __name polyfill
if (typeof window.__name === 'undefined') {
  window.__name = (fn, _name) => fn;
}
`;
}

/**
 * Iframe contentWindow fix script
 */
export function getIframeFixScript(): string {
  return `
// Fix iframe contentWindow detection
const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
  get: function() {
    const win = originalContentWindow.get.call(this);
    if (win) {
      Object.defineProperty(win.navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
    }
    return win;
  },
  configurable: true
});
`;
}

/**
 * SourceURL hiding script
 */
export function getSourceURLScript(): string {
  return `
// Hide sourceURL
//# sourceURL=
`;
}

/**
 * Combine multiple scripts into one
 */
export function combineScripts(...scripts: string[]): string {
  return scripts.filter(Boolean).join('\n\n');
}
