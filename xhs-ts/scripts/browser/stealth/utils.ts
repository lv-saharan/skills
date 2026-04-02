/**
 * Stealth utilities
 *
 * @module browser/stealth/utils
 * @description Utility functions for stealth scripts
 */

/**
 * Injection guard script
 *
 * Prevents multiple executions of stealth script in the same page context.
 * This is necessary because:
 * 1. Each CLI command runs in a new Node.js process
 * 2. WeakSet in Node.js cannot track across processes
 * 3. Playwright creates new JS objects for each CDP connection
 *
 * Solution: Check in browser context (not Node.js) if already injected.
 */
export function getInjectionGuardScript(): string {
  return `
// Injection guard - prevent duplicate execution
if (window.__XHS_STEALTH_INJECTED__) {
  // Already injected, skip
} else {
  window.__XHS_STEALTH_INJECTED__ = true;
`;
}

/**
 * Injection guard closing bracket
 */
export function getInjectionGuardCloseScript(): string {
  return `
} // End injection guard
`;
}

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
 * Combine multiple scripts into one with injection guard
 */
export function combineScripts(...scripts: string[]): string {
  const content = scripts.filter(Boolean).join('\n\n');
  return getInjectionGuardScript() + '\n' + content + '\n' + getInjectionGuardCloseScript();
}
