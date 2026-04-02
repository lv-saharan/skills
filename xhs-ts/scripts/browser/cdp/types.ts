/**
 * CDP Browser Instance Types
 *
 * @module browser/cdp/types
 * @description Type definitions for CDP-based browser instance management
 */

import type { Browser, Page } from 'playwright';
import type { UserName } from '../../user/types';

// ============================================
// Constants
// ============================================

/** CDP port range start (after openclaw's 18800-18899) */
export const CDP_PORT_RANGE_START = 18900;

/** CDP port range end */
export const CDP_PORT_RANGE_END = 18999;

/** Default idle timeout in milliseconds (30 minutes) */
export const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000;

/** Default health check interval in milliseconds (60 seconds) */
export const DEFAULT_HEALTH_CHECK_INTERVAL = 60 * 1000;

/** Default CDP connection timeout in milliseconds */
export const DEFAULT_CDP_CONNECT_TIMEOUT = 10000;

/** Default CDP ready check timeout in milliseconds */
export const DEFAULT_CDP_READY_TIMEOUT = 30000;

// ============================================
// CDP Connection Meta
// ============================================

/**
 * CDP connection metadata
 *
 * Stores information about a CDP browser endpoint.
 */
export interface CDPConnectionMeta {
  /** CDP debugging port */
  port: number;
  /** HTTP endpoint URL (e.g., http://127.0.0.1:18900) */
  endpointUrl: string;
  /** WebSocket endpoint URL (from /json/version) */
  wsEndpoint?: string;
  /** Browser process ID (if available) */
  pid?: number;
  /** Headless mode the browser was started with */
  headless?: boolean;
  /** Connection creation timestamp (ISO 8601) */
  connectedAt: string;
  /** Last activity timestamp (ISO 8601) */
  lastActivityAt: string;
}

// ============================================
// Browser Instance Config
// ============================================

/**
 * Browser instance configuration
 *
 * Configuration for creating or connecting to a CDP browser instance.
 */
export interface BrowserInstanceConfig {
  /** User name for this instance */
  user: UserName;
  /** CDP port (auto-allocated if not specified) */
  cdpPort?: number;
  /** Headless mode */
  headless?: boolean;
  /** Proxy URL */
  proxy?: string;
  /** Idle timeout in milliseconds (default: 30 minutes) */
  idleTimeout?: number;
  /** Health check interval in milliseconds (default: 60 seconds) */
  healthCheckInterval?: number;
  /** Browser executable path (optional) */
  browserPath?: string;
  /** Browser channel (e.g., 'chrome', 'msedge') */
  browserChannel?: string;
}

// ============================================
// Managed Browser Instance
// ============================================

/**
 * Managed browser instance
 *
 * A browser instance managed by the BrowserInstanceManager.
 */
export interface ManagedBrowserInstance {
  /** Unique instance ID */
  id: string;
  /** User name */
  user: UserName;
  /** Playwright Browser object */
  browser: Browser;
  /** CDP connection metadata */
  cdp: CDPConnectionMeta;
  /** Configuration used to create this instance */
  config: BrowserInstanceConfig;
  /** Activity tracking */
  activity: {
    /** Last activity timestamp */
    lastActivity: Date;
    /** Whether instance is currently active */
    isActive: boolean;
  };
  /** Creation timestamp */
  createdAt: Date;
}

// ============================================
// Port Allocation Result
// ============================================

/**
 * Port allocation result
 *
 * Result of attempting to allocate a CDP port.
 */
export interface PortAllocationResult {
  /** Whether allocation was successful */
  success: boolean;
  /** Allocated port number (if successful) */
  port?: number;
  /** Error message (if failed) */
  error?: string;
}

// ============================================
// Main Page Info
// ============================================

/**
 * Main page information
 *
 * Tracks the main page for a browser instance.
 * The main page is kept open after login and serves as the session page.
 */
export interface MainPageInfo {
  /** User name */
  user: UserName;
  /** Main page reference */
  page: Page;
  /** Creation timestamp */
  createdAt: Date;
  /** Last navigation URL */
  currentUrl?: string;
  /** Whether the main page is currently in use */
  inUse: boolean;
}

// ============================================
// Health Check Result
// ============================================

/**
 * Health check result for a browser instance
 */
export interface HealthCheckResult {
  /** Instance ID */
  instanceId: string;
  /** User name */
  user: UserName;
  /** Whether browser is connected */
  isConnected: boolean;
  /** Whether browser is responsive (can execute commands) */
  isResponsive: boolean;
  /** Idle time in milliseconds */
  idleTimeMs: number;
  /** Whether instance should be cleaned up */
  shouldCleanup: boolean;
  /** Reason for cleanup (if applicable) */
  cleanupReason?: 'disconnected' | 'idle_timeout' | 'error';
  /** Error message (if any) */
  error?: string;
}

// ============================================
// Instance Manager State
// ============================================

/**
 * Instance manager state
 *
 * Snapshot of the current state of the browser instance manager.
 */
export interface InstanceManagerState {
  /** Total number of managed instances */
  totalInstances: number;
  /** Active instances by user */
  instancesByUser: Record<
    UserName,
    {
      instanceId: string;
      cdpPort: number;
      createdAt: string;
      lastActivity: string;
    }
  >;
  /** Main pages by user */
  mainPagesByUser: Record<
    UserName,
    {
      createdAt: string;
      currentUrl?: string;
    }
  >;
}
