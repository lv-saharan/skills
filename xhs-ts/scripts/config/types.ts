/**
 * Configuration types
 *
 * @module config/types
 * @description Type definitions for configuration
 */

// ============================================
// Platform Configuration
// ============================================

export interface DelayConfig {
  mean: number;
  stdDev: number;
}

export interface RangeConfig {
  min: number;
  max: number;
}

export interface PlatformConfig {
  name: string;
  domain: string;
  urls: {
    home: string;
    login: string;
    explore?: string;
    creator?: string;
    creatorPublish?: string;
  };
  timeouts: {
    networkIdle: number;
    pageLoad: number;
    upload?: number;
    login: number;
    selector: number;
    qrCheckInterval: number;
    captcha?: number;
  };
  delays: {
    afterNavigation: DelayConfig;
    afterClick: DelayConfig;
    batchInterval: DelayConfig;
  };
  stealthDelays: {
    'gui-native': { action: RangeConfig; read: RangeConfig };
    headless: { action: RangeConfig; read: RangeConfig };
  };
}

// ============================================
// Login Method
// ============================================

/** Login method type */
export type LoginMethod = 'qr' | 'sms' | 'cookie';

// ============================================
// Application Configuration
// ============================================

/**
 * Application configuration from environment
 *
 * Environment variables:
 * - PROXY: Proxy URL (optional)
 * - HEADLESS: Headless browser mode
 * - BROWSER_PATH: Custom browser executable path (optional)
 * - BROWSER_CHANNEL: Browser channel (e.g., 'chrome', 'msedge')
 * - DEBUG: Enable debug logging (default: false)
 */
export interface AppConfig {
  /** Proxy URL */
  proxy: string | undefined;
  /** Headless browser mode */
  headless: boolean;
  /** Custom browser executable path */
  browserPath: string | undefined;
  /** Browser channel */
  browserChannel: string | undefined;
  /** Debug logging enabled */
  debug: boolean;
}
