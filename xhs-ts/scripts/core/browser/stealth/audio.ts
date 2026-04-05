/**
 * Audio stealth module
 *
 * @module browser/stealth/audio
 * @description Add noise to audio fingerprint
 */

import type { UserFingerprint } from './types';

/**
 * Generate Audio fingerprint noise script
 */
export function generateAudioScript(fp: UserFingerprint): string {
  return `
// Audio fingerprint noise (seed: ${fp.audioNoiseSeed})

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
    
    // toString spoofing
    const getFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
    if (getFloatFrequencyData) getFloatFrequencyData.toString = function() { return 'function getFloatFrequencyData() { [native code] }'; };
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
    
    // toString spoofing
    const getChannelData = AudioBuffer.prototype.getChannelData;
    if (getChannelData) getChannelData.toString = function() { return 'function getChannelData() { [native code] }'; };
  }
})();
`;
}
