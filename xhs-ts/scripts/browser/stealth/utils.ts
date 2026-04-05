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
 *
 * CRITICAL: This must be placed OUTSIDE injection guard to ensure it always runs.
 * Reason: When CDP context is reused, the injection guard flag (__XHS_STEALTH_INJECTED__)
 * may already be set from a previous page, causing the guard to skip the entire script.
 * But __name polyfill must always be available for tsx/esbuild compiled page.evaluate code.
 *
 * Uses Object.defineProperty to prevent XHS page scripts from overwriting.
 */
export function getPolyfillScript(): string {
  return `
// __name polyfill - always executes (outside injection guard)
// Use Object.defineProperty to prevent XHS from overwriting
if (typeof window.__name === 'undefined') {
  try {
    Object.defineProperty(window, '__name', {
      value: (fn, _name) => fn,
      writable: false,
      configurable: true
    });
  } catch (e) {
    window.__name = (fn, _name) => fn;
  }
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
 *
 * CRITICAL: __name polyfill is placed OUTSIDE injection guard.
 * Structure: polyfill (always) → injection guard → other modules → guard close
 *
 * This ensures:
 * 1. __name is always available for tsx/esbuild compiled page.evaluate code
 * 2. Other modules are protected from duplicate injection by the guard
 * 3. Context reuse doesn't break __name polyfill availability
 */
export function combineScripts(...scripts: string[]): string {
  const polyfill = getPolyfillScript();
  const otherModules = scripts.filter(Boolean).join('\n\n');

  // Structure: polyfill (unguarded) → guard → modules → guard close
  return (
    polyfill +
    '\n' +
    getInjectionGuardScript() +
    '\n' +
    otherModules +
    '\n' +
    getInjectionGuardCloseScript()
  );
}
