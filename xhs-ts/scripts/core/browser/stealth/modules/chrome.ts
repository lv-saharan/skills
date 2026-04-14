import type { UserFingerprint } from '../types';
/**
 * Chrome API stealth module
 *
 * @module browser/stealth/chrome
 * @description Mock Chrome-specific APIs
 */

/**
 * Generate Chrome API mock script
 */
export function generateChromeScript(): string {
  return `
// Chrome API mock (based on puppeteer-extra-plugin-stealth)

(function() {
  if (!window.chrome) {
    Object.defineProperty(window, 'chrome', {
      writable: true,
      enumerable: true,
      configurable: false,
      value: {}
    });
  }

  // chrome.runtime
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      connect: function() {},
      sendMessage: function() {},
      onMessage: { addListener: function() {}, removeListener: function() {} }
    };
  }

  // chrome.app
  if (!window.chrome.app) {
    window.chrome.app = {
      isInstalled: false,
      InstallState: { DISABLED: 0, INSTALLED: 1, NOT_INSTALLED: 2 },
      RunningState: { CANNOT_RUN: 0, READY_TO_RUN: 1, RUNNING: 2 }
    };
  }

  // chrome.csi - Chrome Speed Index
  if (!window.chrome.csi) {
    window.chrome.csi = function() {
      return {
        onloadT: Date.now(),
        startE: Date.now() - 1000,
        pageT: Date.now(),
        tran: 15
      };
    };
  }

  // chrome.loadTimes
  if (!window.chrome.loadTimes) {
    window.chrome.loadTimes = function() {
      const now = Date.now() / 1000;
      return {
        connectionInfo: 'h2',
        npnNegotiatedProtocol: 'h2',
        navigationType: 'Other',
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true,
        firstPaintAfterLoadTime: 0,
        requestTime: now - 1,
        startLoadTime: now - 0.5,
        commitLoadTime: now - 0.3,
        finishDocumentLoadTime: now - 0.1,
        finishLoadTime: now,
        firstPaintTime: now - 0.2
      };
    };
  }

  // toString spoofing for Chrome APIs
  if (window.chrome.loadTimes) {
    window.chrome.loadTimes.toString = function() { return 'function loadTimes() { [native code] }'; };
  }
  if (window.chrome.csi) {
    window.chrome.csi.toString = function() { return 'function csi() { [native code] }'; };
  }
})();
`;
}

import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * chrome stealth module implementation
 */
export const chromeModule: StealthModule = {
  name: 'chrome',
  enabledByDefault: true,

  generate(_fp: UserFingerprint, _config?: unknown): string {
    return generateChromeScript();
  },
};

// Auto-register module
autoRegister(chromeModule);
