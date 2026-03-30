/**
 * Battery stealth module
 *
 * @module browser/stealth/battery
 * @description Mock Battery API
 */

/**
 * Generate Battery API mock script
 */
export function generateBatteryScript(): string {
  return `
// Battery API mock

if ('getBattery' in navigator) {
  navigator.getBattery = function() {
    return Promise.resolve({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1.0,
      onchargingchange: null,
      onchargingtimechange: null,
      ondischargingtimechange: null,
      onlevelchange: null
    });
  };
}
`;
}
