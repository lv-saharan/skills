/**
 * WebGL stealth module
 *
 * @module browser/stealth/webgl
 * @description Spoof WebGL fingerprint to hide automation
 */

import type { UserFingerprint } from '../types';

/**
 * Generate WebGL stealth script
 */
export function generateWebGLScript(fp: UserFingerprint): string {
  return `
// WebGL fingerprint spoofing (user-bound)

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

// toString spoofing for WebGL methods
if (typeof WebGLRenderingContext !== 'undefined') {
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  if (getParameter) getParameter.toString = function() { return 'function getParameter() { [native code] }'; };
}

if (typeof WebGL2RenderingContext !== 'undefined') {
  const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
  if (getParameter2) getParameter2.toString = function() { return 'function getParameter() { [native code] }'; };
}
`;
}

import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * webgl stealth module implementation
 */
export const webglModule: StealthModule = {
  name: 'webgl',
  enabledByDefault: true,

  generate(fp: UserFingerprint, _config?: unknown): string {
    return generateWebGLScript(fp);
  },
};

// Auto-register module
autoRegister(webglModule);
