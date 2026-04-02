/**
 * Environment detection module
 *
 * @module user/environment
 * @description Detect device environment and generate environment-aware fingerprints
 */

import os from 'os';
import { execSync } from 'child_process';
import type { DevicePlatform } from '../browser/fingerprint-presets';
import { MAINSTREAM_PRESETS, type DevicePreset } from '../browser/fingerprint-presets';
import type { EnvironmentType, UserEnvironment, DeviceProfile } from './types';
import { debugLog } from '../utils/helpers';

// ============================================
// Screen Resolution Detection
// ============================================

export interface ScreenResolution {
  width: number;
  height: number;
}

/**
 * Detect screen resolution on Windows using PowerShell
 */
function detectWindowsScreen(): ScreenResolution | null {
  try {
    // Use PowerShell to get primary monitor resolution
    const output = execSync(
      'powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width,[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height"',
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();

    const [width, height] = output.split('\n').map((s) => parseInt(s.trim(), 10));
    if (width > 0 && height > 0) {
      return { width, height };
    }
  } catch {
    // Fallback: try wmic
    try {
      const output = execSync('wmic desktopmonitor get screenheight,screenwidth /value', {
        encoding: 'utf-8',
        timeout: 5000,
      });
      const widthMatch = output.match(/ScreenWidth=(\d+)/);
      const heightMatch = output.match(/ScreenHeight=(\d+)/);
      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1], 10);
        const height = parseInt(heightMatch[1], 10);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    } catch {
      // Ignore errors
    }
  }
  return null;
}

/**
 * Detect screen resolution on macOS using osascript
 */
function detectMacScreen(): ScreenResolution | null {
  try {
    const output = execSync(
      'osascript -e "tell application \\"Finder\\" to get bounds of window of desktop"',
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();

    // Output format: "0, 0, 1920, 1080" (left, top, right, bottom)
    const parts = output.split(',').map((s) => parseInt(s.trim(), 10));
    if (parts.length >= 4) {
      const width = parts[2] - parts[0];
      const height = parts[3] - parts[1];
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
  } catch {
    // Fallback: try system_profiler
    try {
      const output = execSync('system_profiler SPDisplaysDataType', {
        encoding: 'utf-8',
        timeout: 10000,
      });
      // Look for resolution like "Resolution: 2560 x 1440"
      const match = output.match(/Resolution:\s*(\d+)\s*x\s*(\d+)/i);
      if (match) {
        return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
      }
    } catch {
      // Ignore errors
    }
  }
  return null;
}

/**
 * Detect screen resolution on Linux using xrandr
 */
function detectLinuxScreen(): ScreenResolution | null {
  try {
    const output = execSync('xrandr --query', { encoding: 'utf-8', timeout: 5000 });

    // Look for connected display with resolution
    // Format: "HDMI-1 connected primary 1920x1080+0+0"
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/connected.*?(\d+)x(\d+)\+/);
      if (match) {
        return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
      }
    }

    // Alternative: look for current resolution in screen section
    for (const line of lines) {
      if (line.includes('*')) {
        const match = line.match(/\s*(\d+)x(\d+)\s+\*/);
        if (match) {
          return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
        }
      }
    }
  } catch {
    // Ignore errors - likely no X11/Wayland
  }
  return null;
}

/**
 * Detect real screen resolution
 *
 * Attempts to detect the primary monitor's resolution using platform-specific methods.
 * Returns null if detection fails (headless environment, no display, etc.)
 *
 * @returns Screen resolution or null if undetectable
 */
export function detectScreenResolution(): ScreenResolution | null {
  // Skip detection in headless environment
  if (!hasDisplaySupport()) {
    debugLog('No display support, skipping screen detection');
    return null;
  }

  const platform = process.platform;
  let resolution: ScreenResolution | null = null;

  switch (platform) {
    case 'win32':
      resolution = detectWindowsScreen();
      break;
    case 'darwin':
      resolution = detectMacScreen();
      break;
    case 'linux':
      resolution = detectLinuxScreen();
      break;
  }

  if (resolution) {
    debugLog(`Detected screen resolution: ${resolution.width}x${resolution.height}`);
  } else {
    debugLog('Could not detect screen resolution, will use preset');
  }

  return resolution;
}

// ============================================
// Environment Detection
// ============================================

/**
 * Check if the current environment supports a graphical display
 *
 * @returns true if GUI is available, false for headless/server environments
 */
export function hasDisplaySupport(): boolean {
  const platform = process.platform;

  // Linux: check for DISPLAY or WAYLAND_DISPLAY
  if (platform === 'linux') {
    return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  }

  // Windows and macOS typically have display support
  return true;
}

/**
 * Detect current device characteristics
 *
 * Uses Node.js APIs to get real device info for smart preset matching.
 */
export function detectDeviceProfile(): DeviceProfile {
  // Detect platform
  let platform: DevicePlatform;
  switch (process.platform) {
    case 'darwin':
      platform = 'MacIntel';
      break;
    case 'linux':
      platform = 'Linux x86_64';
      break;
    default:
      platform = 'Windows';
  }

  // Detect CPU cores
  const hardwareConcurrency = os.cpus().length;

  // Detect memory (in GB, rounded to common values)
  const totalGB = os.totalmem() / (1024 * 1024 * 1024);
  const deviceMemory = totalGB >= 30 ? 32 : totalGB >= 14 ? 16 : totalGB >= 6 ? 8 : 4;

  return {
    platform,
    hardwareConcurrency,
    deviceMemory,
  };
}

/**
 * Detect the environment type
 *
 * @returns Environment type based on display support and other factors
 */
export function detectEnvironmentType(): EnvironmentType {
  if (hasDisplaySupport()) {
    return 'gui-native';
  }

  // No display - use headless-smart by default
  return 'headless-smart';
}

/**
 * Detect full environment information
 *
 * @returns Complete environment information for fingerprint generation
 */
export function detectEnvironment(): UserEnvironment {
  const type = detectEnvironmentType();
  const deviceProfile = detectDeviceProfile();

  // Determine fingerprint source based on environment type
  let fingerprintSource: 'preset' | 'real' | 'custom';
  let presetDescription: string | undefined;

  switch (type) {
    case 'gui-native':
      fingerprintSource = 'real';
      break;
    case 'gui-virtual':
      fingerprintSource = 'real';
      break;
    case 'headless-smart':
      fingerprintSource = 'preset';
      presetDescription = getMostMainstreamPresetInfo().description;
      break;
    case 'headless-custom':
      fingerprintSource = 'preset';
      break;
  }

  return {
    type,
    fingerprintSource,
    device: deviceProfile,
    presetDescription,
  };
}

// ============================================
// Smart Preset Selection
// ============================================

/**
 * Select preset by weight from a list
 */
function selectByWeight(presets: DevicePreset[]): DevicePreset {
  const totalWeight = presets.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const preset of presets) {
    random -= preset.weight;
    if (random <= 0) {
      return preset;
    }
  }

  return presets[0];
}

/**
 * Get the most mainstream preset (highest weight)
 */
export function getMostMainstreamPreset(): DevicePreset {
  return MAINSTREAM_PRESETS.reduce((best, p) => (p.weight > best.weight ? p : best));
}

/**
 * Get the most mainstream preset info
 */
export function getMostMainstreamPresetInfo(): {
  description: string;
  platform: string;
  screen: string;
} {
  const preset = getMostMainstreamPreset();
  return {
    description: preset.description,
    platform: preset.device.platform,
    screen: `${preset.screen.width}×${preset.screen.height}`,
  };
}

/**
 * Select preset by smart device matching
 *
 * Strategy:
 * 1. Detect current device characteristics (CPU, memory, screen)
 * 2. Filter presets by platform match
 * 3. If screen detected, filter by screen resolution match
 * 4. Further filter by hardware proximity (CPU/memory)
 * 5. Select by weight from matched presets
 * 6. Fallback to most mainstream preset
 */
export function selectPresetBySmartMatch(): DevicePreset {
  const profile = detectDeviceProfile();
  const screenResolution = detectScreenResolution();

  debugLog('Detecting preset for device profile:', profile);
  if (screenResolution) {
    debugLog(`Screen resolution: ${screenResolution.width}x${screenResolution.height}`);
  }

  // Step 1: Filter by platform
  const platformMatched = MAINSTREAM_PRESETS.filter((p) => p.device.platform === profile.platform);

  if (platformMatched.length === 0) {
    // No platform match, use most mainstream
    debugLog('No platform match, using most mainstream preset');
    return getMostMainstreamPreset();
  }

  // Step 2: If screen detected, filter by screen resolution (exact match)
  if (screenResolution) {
    const screenMatched = platformMatched.filter(
      (p) =>
        p.screen.width === screenResolution.width && p.screen.height === screenResolution.height
    );

    if (screenMatched.length > 0) {
      debugLog(
        `Found ${screenMatched.length} screen-matched presets (${screenResolution.width}x${screenResolution.height})`
      );

      // Step 3: Further filter by hardware from screen-matched
      const hardwareFromScreen = screenMatched.filter((p) => {
        const cpuDiff = Math.abs(p.device.hardwareConcurrency - profile.hardwareConcurrency);
        const memDiff = Math.abs(p.device.deviceMemory - profile.deviceMemory);
        return cpuDiff <= 4 && memDiff <= 8;
      });

      if (hardwareFromScreen.length > 0) {
        debugLog(`Found ${hardwareFromScreen.length} hardware+screen matched presets`);
        return selectByWeight(hardwareFromScreen);
      }

      // Use screen-matched presets
      return selectByWeight(screenMatched);
    }

    // No exact screen match, try to find closest screen resolution
    const sortedByScreenDistance = [...platformMatched].sort((a, b) => {
      const distA =
        Math.abs(a.screen.width - screenResolution.width) +
        Math.abs(a.screen.height - screenResolution.height);
      const distB =
        Math.abs(b.screen.width - screenResolution.width) +
        Math.abs(b.screen.height - screenResolution.height);
      return distA - distB;
    });

    // Get presets with similar screen (within 200px total distance)
    const closeScreenMatched = sortedByScreenDistance.filter((p) => {
      const dist =
        Math.abs(p.screen.width - screenResolution.width) +
        Math.abs(p.screen.height - screenResolution.height);
      return dist <= 200;
    });

    if (closeScreenMatched.length > 0) {
      debugLog(`Found ${closeScreenMatched.length} close-screen presets`);
      return selectByWeight(closeScreenMatched);
    }
  }

  // Step 4: Try to match hardware characteristics (soft match)
  // Find presets with similar CPU cores (±4) and memory (±8)
  const hardwareMatched = platformMatched.filter((p) => {
    const cpuDiff = Math.abs(p.device.hardwareConcurrency - profile.hardwareConcurrency);
    const memDiff = Math.abs(p.device.deviceMemory - profile.deviceMemory);
    return cpuDiff <= 4 && memDiff <= 8;
  });

  if (hardwareMatched.length > 0) {
    debugLog(
      `Found ${hardwareMatched.length} hardware-matched presets from ${platformMatched.length} platform-matched`
    );
    return selectByWeight(hardwareMatched);
  }

  // Step 5: Use platform-matched presets
  debugLog(`Using ${platformMatched.length} platform-matched presets (no hardware match)`);
  return selectByWeight(platformMatched);
}
