import type { UserFingerprint } from '../types';
/**
 * WebRTC stealth module
 *
 * @module browser/stealth/webrtc
 * @description Prevent WebRTC leaks
 */

/**
 * Generate WebRTC leak prevention script
 */
export function generateWebRTCScript(): string {
  return `
// WebRTC leak prevention

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
`;
}

import type { StealthModule } from '../types';
import { autoRegister } from '../registry';

/**
 * webrtc stealth module implementation
 */
export const webrtcModule: StealthModule = {
  name: 'webrtc',
  enabledByDefault: true,

  generate(_fp: UserFingerprint, _config?: unknown): string {
    return generateWebRTCScript();
  },
};

// Auto-register module
autoRegister(webrtcModule);
