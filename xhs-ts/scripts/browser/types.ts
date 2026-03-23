/**
 * Browser module types
 *
 * @module browser/types
 * @description Type definitions for browser management with TypeScript 5.2+ AsyncDisposable support
 */

import type { Browser, BrowserContext, Page } from 'playwright';

// ============================================
// Launch Options
// ============================================

/** Browser launch options */
export interface BrowserLaunchOptions {
  /** Headless mode */
  headless?: boolean;
  /** Proxy URL */
  proxy?: string;
  /** Custom browser executable path */
  browserPath?: string;
  /** Browser channel (e.g., 'chrome', 'msedge') */
  browserChannel?: string;
  /** Enable stealth injection (default: true) */
  stealth?: boolean;
}

// ============================================
// Browser Instance (Legacy Interface)
// ============================================

/**
 * Browser instance container (legacy interface)
 * Holds browser, context, and page together
 * @deprecated Use BrowserSession for new code
 */
export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

// ============================================
// AsyncDisposable Resource (TypeScript 5.2+)
// ============================================

/**
 * Represents a resource that can be asynchronously disposed.
 * Compatible with TypeScript 5.2+ `await using` syntax.
 */
export interface AsyncDisposableResource extends AsyncDisposable {
  /** Check if resource is still active */
  readonly isActive: boolean;
  /** Get underlying browser instance */
  readonly browser: Browser;
  /** Get underlying context */
  readonly context: BrowserContext;
  /** Get main page */
  readonly page: Page;
}

// ============================================
// Browser Session
// ============================================

/**
 * Managed browser session with automatic cleanup via `await using`
 *
 * @example
 * ```typescript
 * async function doWork() {
 *   await using session = await BrowserSession.create({ headless: true });
 *   await session.page.goto('https://example.com');
 *   // Automatic cleanup when scope exits
 * }
 * ```
 */
export interface BrowserSession extends AsyncDisposableResource {
  /** Track a dynamically created page for cleanup */
  trackPage(page: Page, id?: string): TrackedPage;
  /** Get all tracked pages */
  readonly trackedPages: readonly TrackedPage[];
  /** Close a specific tracked page */
  closePage(id: string): Promise<boolean>;
  /** Close all extra pages (except main) */
  closeExtraPages(): Promise<number>;
  /** Dispose the session manually (idempotent) */
  dispose(): Promise<CleanupResult>;
  /** Convert to legacy BrowserInstance format */
  toBrowserInstance(): BrowserInstance;
}

/**
 * A page that is tracked for automatic cleanup
 */
export interface TrackedPage extends AsyncDisposable {
  readonly page: Page;
  readonly id: string;
  readonly isClosed: boolean;
  /** Close this page manually (idempotent) */
  close(): Promise<void>;
}

// ============================================
// Cleanup Result
// ============================================

/** Result of cleanup operation */
export interface CleanupResult {
  /** Number of pages closed */
  pagesClosed: number;
  /** Whether context was closed */
  contextClosed: boolean;
  /** Whether browser was closed */
  browserClosed: boolean;
  /** Any errors during cleanup */
  errors: Array<{ resource: string; error: Error }>;
  /** Total cleanup duration in milliseconds */
  duration: number;
}
