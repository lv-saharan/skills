/**
 * CDP Browser Instance Types
 *
 * @module browser/cdp/types
 * @description Type definitions for CDP-based browser instance management
 */

import type { UserName } from '../../user/types';

// ============================================
// Constants
// ============================================

/** CDP port range start (after openclaw's 18800-18899) */
export const CDP_PORT_RANGE_START = 18900;

/** CDP port range end */
export const CDP_PORT_RANGE_END = 18999;

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
