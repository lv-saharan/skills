/**
 * Stealth injection script
 *
 * @module browser/stealth
 * @description Anti-detection script to hide automation fingerprints
 */

import type { UserFingerprint } from '../user/types';

// ============================================
// Dynamic Stealth Script Generator
// ============================================

/**
 * Generate stealth injection script with user-bound fingerprint
 *
 * @param fp - User's device fingerprint configuration
 * @returns JavaScript code to inject into browser context
 */
export function generateStealthScript(fp: UserFingerprint): string {
  return `
// 0. __name polyfill
if (typeof window.__name === 'undefined') {
  window.__name = (fn, _name) => fn;
}

// 1. Hide webdriver property
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true
});

// 2. Mock plugins array
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

// 3. Mock languages (from user config)
Object.defineProperty(navigator, 'languages', {
  get: () => ${JSON.stringify(fp.browser.languages)},
  configurable: true
});

// 4. Mock platform (from user config)
Object.defineProperty(navigator, 'platform', {
  get: () => '${fp.device.platform}',
  configurable: true
});

// 5. Mock hardwareConcurrency (from user config)
Object.defineProperty(navigator, 'hardwareConcurrency', {
  get: () => ${fp.device.hardwareConcurrency},
  configurable: true
});

// 6. Mock deviceMemory (from user config)
Object.defineProperty(navigator, 'deviceMemory', {
  get: () => ${fp.device.deviceMemory},
  configurable: true
});

// 7. Add window.chrome object (based on puppeteer-extra-plugin-stealth)
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

  // chrome.csi - Chrome Speed Index (deprecated but still exists)
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

  // chrome.loadTimes (deprecated but still exists)
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
})();

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

// 11. Mock screen properties (from user config)
Object.defineProperty(screen, 'width', { get: () => ${fp.screen.width}, configurable: true });
Object.defineProperty(screen, 'height', { get: () => ${fp.screen.height}, configurable: true });
Object.defineProperty(screen, 'availWidth', { get: () => ${fp.screen.width}, configurable: true });
Object.defineProperty(screen, 'availHeight', { get: () => ${fp.screen.height} - 40, configurable: true });
Object.defineProperty(screen, 'colorDepth', { get: () => ${fp.screen.colorDepth}, configurable: true });
Object.defineProperty(screen, 'pixelDepth', { get: () => ${fp.screen.colorDepth}, configurable: true });

// 12. WebGL fingerprint (user-bound)
(function() {
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return '${fp.webgl.vendor}';
    if (parameter === 37446) return '${fp.webgl.renderer}';
    return getParameter.call(this, parameter);
  };
  
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return '${fp.webgl.vendor}';
      if (parameter === 37446) return '${fp.webgl.renderer}';
      return getParameter2.call(this, parameter);
    };
  }
})();

// 13. Canvas fingerprint noise (seed: ${fp.canvasNoiseSeed})
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
      } catch (e) {}
    }
    return originalToDataURL.apply(this, arguments);
  };
})();

// 14. Audio fingerprint noise (seed: ${fp.audioNoiseSeed})
(function() {
  const seed = ${fp.audioNoiseSeed};
  const noise = (x) => ((Math.sin(x * seed) * 10000) % 1) / 100000;
  
  if (typeof AnalyserNode !== 'undefined') {
    const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
    AnalyserNode.prototype.getFloatFrequencyData = function(array) {
      originalGetFloatFrequencyData.apply(this, arguments);
      for (let i = 0; i < array.length; i++) {
        array[i] += noise(i);
      }
    };
  }

  if (typeof AudioBuffer !== 'undefined') {
    const originalGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(channel) {
      const data = originalGetChannelData.call(this, channel);
      for (let i = 0; i < data.length; i++) {
        data[i] += noise(i + channel * 1000);
      }
      return data;
    };
  }
})();

// 15. Hide automation in prototype chain
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

// 16. Mock outer dimensions
try {
  if (window.outerWidth === 0) {
    Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth, configurable: true });
  }
  if (window.outerHeight === 0) {
    Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 100, configurable: true });
  }
} catch (e) {}

// 17. User-Agent consistency
Object.defineProperty(navigator, 'userAgent', {
  get: () => '${fp.browser.userAgent}',
  configurable: true
});

Object.defineProperty(navigator, 'vendor', {
  get: () => '${fp.browser.vendor}',
  configurable: true
});

// 18-26. Additional navigator properties (Chrome 131+ standard)
Object.defineProperty(navigator, 'product', { get: () => 'Gecko', configurable: true });
Object.defineProperty(navigator, 'productSub', { get: () => '20030107', configurable: true });
Object.defineProperty(navigator, 'vendorSub', { get: () => '', configurable: true });
Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0, configurable: true });
Object.defineProperty(navigator, 'doNotTrack', { get: () => null, configurable: true });
Object.defineProperty(navigator, 'pdfViewerEnabled', { get: () => true, configurable: true });
Object.defineProperty(navigator, 'cookieEnabled', { get: () => true, configurable: true });
Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
Object.defineProperty(navigator, 'language', { get: () => ${JSON.stringify(fp.browser.languages[0])}, configurable: true });

// 27. WebRTC leak prevention
(function() {
  if (typeof RTCPeerConnection === 'undefined') return;
  const OriginalRTCPeerConnection = RTCPeerConnection;
  window.RTCPeerConnection = function(config) {
    if (config && config.iceServers) {
      config.iceServers = config.iceServers.filter(function(server) {
        var urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        return !urls.some(function(url) { return typeof url === 'string' && url.startsWith('stun:'); });
      });
    }
    return new OriginalRTCPeerConnection(config);
  };
  window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
  Object.setPrototypeOf(window.RTCPeerConnection, OriginalRTCPeerConnection);
})();


// 29. toString spoofing for native function appearance
(function() {
  const nativeToString = function(name) {
    return 'function ' + name + '() { [native code] }';
  };

  // Spoof toString for all overridden methods
  if (typeof WebGLRenderingContext !== 'undefined') {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    if (getParameter) getParameter.toString = function() { return nativeToString('getParameter'); };
  }
  
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
    if (getParameter2) getParameter2.toString = function() { return nativeToString('getParameter'); };
  }

  if (typeof HTMLCanvasElement !== 'undefined') {
    const toDataURL = HTMLCanvasElement.prototype.toDataURL;
    if (toDataURL) toDataURL.toString = function() { return nativeToString('toDataURL'); };
  }

  if (typeof AnalyserNode !== 'undefined') {
    const getFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
    if (getFloatFrequencyData) getFloatFrequencyData.toString = function() { return nativeToString('getFloatFrequencyData'); };
  }

  if (typeof AudioBuffer !== 'undefined') {
    const getChannelData = AudioBuffer.prototype.getChannelData;
    if (getChannelData) getChannelData.toString = function() { return nativeToString('getChannelData'); };
  }

  // Chrome API toString spoofing
  if (window.chrome) {
    if (window.chrome.loadTimes) {
      window.chrome.loadTimes.toString = function() { return nativeToString('loadTimes'); };
    }
    if (window.chrome.csi) {
      window.chrome.csi.toString = function() { return nativeToString('csi'); };
    }
  }
})();

// 28. Notification permission consistency
try {
  if (typeof Notification !== 'undefined') {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'default',
      configurable: true
    });
  }
} catch (e) {}
`;
}

// ============================================
// Legacy Static Script (Backward Compatibility)
// ============================================

/**
 * Static stealth injection script (legacy)
 *
 * @deprecated Use generateStealthScript() with user fingerprint instead
 */
export const STEALTH_INJECTION_SCRIPT = `
// Legacy script - use generateStealthScript() instead
if (typeof window.__name === 'undefined') {
  window.__name = (fn, _name) => fn;
}
Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
`;
