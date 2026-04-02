/**
 * Config module types
 *
 * @module config/types
 * @description Type definitions for configuration
 */

import type { LoginMethod } from '../shared';

/**
 * Application configuration from environment
 *
 * Environment variables:
 * - PROXY: Proxy URL (optional)
 * - HEADLESS: Headless browser mode
 * - BROWSER_PATH: Custom browser executable path (optional)
 * - BROWSER_CHANNEL: Browser channel (e.g., 'chrome', 'msedge')
 * - DEBUG: Enable debug logging (default: false)
 * - LOGIN_TIMEOUT: Login timeout in milliseconds (default: 120000)
 * - LOGIN_METHOD: Login method 'qr' or 'sms' (default: 'qr')
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
  /** Login timeout in milliseconds */
  loginTimeout: number;
  /** Default login method */
  loginMethod: LoginMethod;
}
