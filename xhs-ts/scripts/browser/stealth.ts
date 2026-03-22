/**
 * Stealth injection script
 *
 * @module browser/stealth
 * @description Anti-detection script to hide automation fingerprints
 */

/**
 * Anti-detection script to hide automation fingerprints
 * This script is injected before any page loads
 */
export const STEALTH_INJECTION_SCRIPT = `
// 0. __name polyfill - fixes tsx/esbuild injection conflicting with XHS page's __name
// tsx compiler injects __name() helper for function name preservation
// This conflicts with XHS page's own __name definition
// Adding this no-op polyfill allows page.evaluate() to work without errors
if (typeof window.__name === 'undefined') {
  window.__name = (fn, _name) => fn;
}

// 1. Hide webdriver property
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true
});

// 2. Mock plugins array (Chrome typically has PDF viewer, etc.)
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    const plugins = [
      { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer', length: 1 },
      { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', length: 1 },
      { name: 'Native Client', description: '', filename: 'internal-nacl-plugin', length: 2 }
    ];
    plugins.item = (index) => plugins[index] || null;
    plugins.namedItem = (name) => plugins.find(p => p.name === name) || null;
    plugins.refresh = () => {};
    return plugins;
  },
  configurable: true
});

// 3. Mock languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['zh-CN', 'zh', 'en-US', 'en'],
  configurable: true
});

// 4. Mock platform
Object.defineProperty(navigator, 'platform', {
  get: () => 'Win32',
  configurable: true
});

// 5. Mock hardwareConcurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
  get: () => 8,
  configurable: true
});

// 6. Mock deviceMemory
Object.defineProperty(navigator, 'deviceMemory', {
  get: () => 8,
  configurable: true
});

// 7. Add window.chrome object (missing in automation)
if (!window.chrome) {
  window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
}

// 8. Mock permissions API
const originalQuery = window.navigator.permissions?.query;
if (originalQuery) {
  window.navigator.permissions.query = (parameters) => {
    if (parameters.name === 'notifications') {
      return Promise.resolve({ state: Notification.permission });
    }
    return originalQuery(parameters);
  };
}

// 9. Hide automation indicators in connection info
Object.defineProperty(navigator, 'connection', {
  get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10, saveData: false }),
  configurable: true
});

// 10. Fix iframe contentWindow detection
const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
  get: function() {
    const window = originalContentWindow.get.call(this);
    if (window) {
      Object.defineProperty(window.navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
    }
    return window;
  },
  configurable: true
});

// 11. Mock screen properties
Object.defineProperty(screen, 'colorDepth', { get: () => 24, configurable: true });
Object.defineProperty(screen, 'pixelDepth', { get: () => 24, configurable: true });

// 12. WebGL fingerprint randomization
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) return 'Google Inc. (NVIDIA)';
  if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)';
  return getParameter.call(this, parameter);
};

// 13. Hide automation in prototype chain
const oldCall = Function.prototype.call;
Function.prototype.call = function() {
  if (arguments.length > 0 && arguments[0] !== null && arguments[0] !== undefined) {
    if (arguments[0].navigator && arguments[0].navigator.webdriver !== undefined) {
      Object.defineProperty(arguments[0].navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
    }
  }
  return oldCall.apply(this, arguments);
};

// 14. Mock outer dimensions
try {
  if (window.outerWidth === 0) {
    Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth, configurable: true });
  }
  if (window.outerHeight === 0) {
    Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 100, configurable: true });
  }
} catch (e) {}
`;
