/**
 * Browser Connection Module
 *
 * @module core/browser/connection
 * @description Browser connection utilities for Playwright BrowserServer
 */

// ============================================
// BrowserServer Connection
// ============================================

export { connectToServer, checkServerConnection, checkBrowserEndpointHealth } from './connector';

// ============================================
// Constants
// ============================================

export { DEFAULT_CONNECT_TIMEOUT } from './constants';
