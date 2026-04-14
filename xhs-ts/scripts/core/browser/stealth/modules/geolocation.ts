/**
 * Geolocation stealth module
 *
 * @module browser/stealth/modules/geolocation
 * @description Mock geolocation API with configurable location
 */

import type { UserFingerprint, GeolocationConfig } from '../types';
import type { StealthModule } from '../types';
import { autoRegister } from '../registry';
import { DEFAULT_GEOLOCATION } from '../constants';

/**
 * Generate Geolocation mock script
 */
function generateGeolocationScriptInternal(
  config: GeolocationConfig = DEFAULT_GEOLOCATION
): string {
  const {
    latitude,
    longitude,
    accuracy,
    altitude = null,
    altitudeAccuracy = null,
    heading = null,
    speed = null,
  } = config;

  return `
// Geolocation mock (latitude: ${latitude}, longitude: ${longitude})

(function() {
  const mockPosition = {
    coords: {
      latitude: ${latitude},
      longitude: ${longitude},
      accuracy: ${accuracy},
      altitude: ${altitude},
      altitudeAccuracy: ${altitudeAccuracy},
      heading: ${heading},
      speed: ${speed}
    },
    timestamp: Date.now()
  };

  // Mock getCurrentPosition
  const originalGetCurrentPosition = navigator.geolocation?.getCurrentPosition;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      // Simulate slight delay like real geolocation
      setTimeout(function() {
        if (success) {
          success(mockPosition);
        }
      }, 100 + Math.random() * 200);
    };

    // Mock watchPosition
    navigator.geolocation.watchPosition = function(success, error, options) {
      // Return a fake watch ID
      const watchId = Math.floor(Math.random() * 1000000);
      
      // Call success immediately
      setTimeout(function() {
        if (success) {
          success(mockPosition);
        }
      }, 100);
      
      return watchId;
    };

    // Mock clearWatch
    navigator.geolocation.clearWatch = function(watchId) {
      // No-op
    };
  }

  // Mock Permissions API for geolocation
  const originalQuery = window.navigator.permissions?.query;
  if (originalQuery) {
    const _originalQuery = originalQuery.bind(navigator.permissions);
    navigator.permissions.query = function(parameters) {
      if (parameters.name === 'geolocation') {
        return Promise.resolve({ 
          state: 'granted',
          onchange: null
        });
      }
      return _originalQuery(parameters);
    };
  }
})();
`;
}

/**
 * Geolocation stealth module implementation
 */
export const geolocationModule: StealthModule = {
  name: 'geolocation',
  enabledByDefault: true,

  generate(_fp: UserFingerprint, _config?: unknown): string {
    // Config for geolocation is GeolocationConfig, not StealthModuleConfig
    const geoConfig = _config as GeolocationConfig | undefined;
    return generateGeolocationScriptInternal(geoConfig);
  },
};

// Auto-register module
autoRegister(geolocationModule);
