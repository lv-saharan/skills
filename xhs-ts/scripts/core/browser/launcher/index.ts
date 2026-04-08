/**
 * Browser Launcher Module
 *
 * @module core/browser/launcher
 * @description Browser launch utilities with BrowserServer support
 */

// ============================================
// BrowserServer Launch (Recommended)
// ============================================

export {
  launchBrowserServer,
  setupBrowserContext,
  type BrowserServerLaunchResult,
  type BrowserInstanceWithPage,
} from './browser-launcher';

// ============================================
// Executable Finder
// ============================================

export { findBrowserExecutablePath } from './executable-finder';

// ============================================
// Process Manager
// ============================================

export { forceKillProcess, isProcessRunning } from './process-manager';
