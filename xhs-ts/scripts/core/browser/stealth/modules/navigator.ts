/**
 * Navigator stealth module
 *
 * @module browser/stealth/modules/navigator
 * @description Spoof navigator properties to hide automation
 */

import type { UserFingerprint } from '../types';
import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * Navigator stealth module implementation
 */
export const navigatorModule: StealthModule = {
  name: 'navigator',
  enabledByDefault: true,

  generate(fp: UserFingerprint): string {
    return `
// Navigator properties spoofing

// Hide webdriver property
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true
});

// Mock plugins array
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

// Mock mimeTypes array
Object.defineProperty(navigator, 'mimeTypes', {
  get: () => {
    const mimeTypes = [
      { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: { name: 'Chrome PDF Plugin' } },
      { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: { name: 'Chrome PDF Plugin' } },
      { type: 'application/x-nacl', suffixes: 'nexe', description: 'Native Client Executable', enabledPlugin: { name: 'Native Client' } },
      { type: 'application/x-pnacl', suffixes: 'pexe', description: 'Portable Native Client Executable', enabledPlugin: { name: 'Native Client' } }
    ];
    mimeTypes.item = (index) => mimeTypes[index] || null;
    mimeTypes.namedItem = (name) => mimeTypes.find(m => m.type === name) || null;
    return mimeTypes;
  },
  configurable: true
});

// Mock languages (from user config)
Object.defineProperty(navigator, 'languages', {
  get: () => ${JSON.stringify(fp.browser.languages)},
  configurable: true
});

// Mock platform (from user config)
Object.defineProperty(navigator, 'platform', {
  get: () => '${fp.device.platform}',
  configurable: true
});

// Mock hardwareConcurrency (from user config)
Object.defineProperty(navigator, 'hardwareConcurrency', {
  get: () => ${fp.device.hardwareConcurrency},
  configurable: true
});

// Mock deviceMemory (from user config)
Object.defineProperty(navigator, 'deviceMemory', {
  get: () => ${fp.device.deviceMemory},
  configurable: true
});

// User-Agent consistency
Object.defineProperty(navigator, 'userAgent', {
  get: () => '${fp.browser.userAgent}',
  configurable: true
});

Object.defineProperty(navigator, 'vendor', {
  get: () => '${fp.browser.vendor}',
  configurable: true
});

// Additional navigator properties (Chrome 131+ standard)
Object.defineProperty(navigator, 'product', { get: () => 'Gecko', configurable: true });
Object.defineProperty(navigator, 'productSub', { get: () => '20030107', configurable: true });
Object.defineProperty(navigator, 'vendorSub', { get: () => '', configurable: true });
Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0, configurable: true });
Object.defineProperty(navigator, 'doNotTrack', { get: () => null, configurable: true });
Object.defineProperty(navigator, 'pdfViewerEnabled', { get: () => true, configurable: true });
Object.defineProperty(navigator, 'cookieEnabled', { get: () => true, configurable: true });
Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
Object.defineProperty(navigator, 'language', { get: () => ${JSON.stringify(fp.browser.languages[0])}, configurable: true });

// Navigator legacy properties
Object.defineProperty(navigator, 'appCodeName', { get: () => 'Mozilla', configurable: true });
Object.defineProperty(navigator, 'appName', { get: () => 'Netscape', configurable: true });
Object.defineProperty(navigator, 'appVersion', { 
  get: () => '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  configurable: true 
});

// Mock connection info
Object.defineProperty(navigator, 'connection', {
  get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10, saveData: false }),
  configurable: true
});

// Mock permissions API
const originalQuery = window.navigator.permissions?.query;
if (originalQuery) {
  window.navigator.permissions.query = (parameters) => {
    if (parameters.name === 'notifications') {
      return Promise.resolve({ state: Notification.permission });
    }
    return originalQuery(parameters);
  };
}

`;
  },
};

// Auto-register module
autoRegister(navigatorModule);
