/**
 * Browser module types
 *
 * @module browser/types
 * @description Type definitions for CDP-based browser management
 */

import type { Browser, BrowserContext, Page } from 'playwright';

// ============================================
// Browser Instance
// ============================================

/**
 * Browser instance container
 * Holds browser, context, page and connection info together
 *
 * Core properties (browser, context, page) are always available.
 * Connection properties (port, pid, wsEndpoint, isNewInstance) are
 * available when launched via launchBrowser().
 */
export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  /** CDP debugging port (available from launchBrowser) */
  port?: number;
  /** Browser process ID (available from launchBrowser) */
  pid?: number;
  /** WebSocket endpoint URL */
  wsEndpoint?: string;
  /** Whether this is a newly spawned instance */
  isNewInstance?: boolean;
}

// ============================================
// Environment Types
// ============================================

/**
 * Environment detection type
 * Used to determine appropriate stealth behavior
 */
export type EnvironmentType = 'gui-native' | 'gui-virtual' | 'headless-smart' | 'headless-custom';
