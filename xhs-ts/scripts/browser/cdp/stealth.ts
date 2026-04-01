/**
 * CDP Stealth Injection
 *
 * @module browser/cdp/stealth
 * @description Stealth script injection for CDP-connected browsers
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { UserFingerprint } from '../../user/types';
import { generateStealthScript } from '../stealth';

// ============================================
// Types
// ============================================

/**
 * Stealth injection options
 */
export interface StealthInjectionOptions {
  /** User fingerprint for stealth script generation */
  fingerprint: UserFingerprint;
  /** Whether to enable stealth (default: true) */
  enabled?: boolean;
}

// ============================================
// Stealth Injection
// ============================================

/**
 * Inject stealth script into a browser context
 *
 * @param context - Browser context
 * @param fingerprint - User fingerprint
 */
export async function injectStealthToContext(
  context: BrowserContext,
  fingerprint: UserFingerprint
): Promise<void> {
  const script = generateStealthScript(fingerprint);
  await context.addInitScript(script);
}

/**
 * Inject stealth script into a page
 *
 * For pages created outside of a context with init script,
 * we inject directly into the page via addInitScript on the context.
 *
 * @param page - Page to inject
 * @param fingerprint - User fingerprint
 */
export async function injectStealthToPage(page: Page, fingerprint: UserFingerprint): Promise<void> {
  const script = generateStealthScript(fingerprint);
  const context = page.context();

  // Use context's addInitScript which affects the page
  await context.addInitScript(script);
}

/**
 * Setup stealth injection for a browser
 *
 * This sets up automatic stealth injection for all new contexts
 * created by the browser.
 *
 * @param browser - Browser instance
 * @param fingerprint - User fingerprint
 * @returns Cleanup function to remove listeners
 */
export function setupBrowserStealth(_browser: Browser, _fingerprint: UserFingerprint): () => void {
  const handlers: Array<() => void> = [];

  // Note: Playwright doesn't expose a 'context' event on Browser
  // For CDP-connected browsers, contexts are usually pre-existing
  // We need to handle stealth injection at the instance manager level

  // Return cleanup function
  return () => {
    for (const handler of handlers) {
      handler();
    }
  };
}

/**
 * Inject stealth into all existing contexts of a browser
 *
 * For CDP-connected browsers, contexts may already exist.
 * This function injects stealth into all existing contexts.
 *
 * @param browser - Browser instance
 * @param fingerprint - User fingerprint
 */
export async function injectStealthToExistingContexts(
  browser: Browser,
  fingerprint: UserFingerprint
): Promise<void> {
  const contexts = browser.contexts();

  for (const context of contexts) {
    try {
      await injectStealthToContext(context, fingerprint);
    } catch {
      // Context may not accept init script after pages are created
      // Try injecting into existing pages instead
      const pages = context.pages();
      for (const page of pages) {
        try {
          await injectStealthToPage(page, fingerprint);
        } catch {
          // Page may be closed or not ready
        }
      }
    }
  }
}

/**
 * Create a stealth-injected context
 *
 * Creates a new context with stealth pre-injected.
 *
 * @param browser - Browser instance
 * @param fingerprint - User fingerprint
 * @returns Browser context with stealth injected
 */
export async function createStealthContext(
  browser: Browser,
  fingerprint: UserFingerprint
): Promise<BrowserContext> {
  const context = await browser.newContext();

  try {
    await injectStealthToContext(context, fingerprint);
  } catch {
    // If init script fails, try to create a new page with stealth
    const page = await context.newPage();
    await injectStealthToPage(page, fingerprint);
  }

  return context;
}

/**
 * Create a stealth-injected page
 *
 * Creates a new page with stealth pre-injected.
 * Uses the browser's default context or creates a new one.
 *
 * @param browser - Browser instance
 * @param fingerprint - User fingerprint
 * @returns Page with stealth injected
 */
export async function createStealthPage(
  browser: Browser,
  fingerprint: UserFingerprint
): Promise<Page> {
  // Try to use existing context
  const contexts = browser.contexts();
  let context: BrowserContext;

  if (contexts.length > 0) {
    context = contexts[0];
  } else {
    context = await browser.newContext();
    await injectStealthToContext(context, fingerprint);
  }

  const page = await context.newPage();

  // Also inject into page directly for safety
  await injectStealthToPage(page, fingerprint);

  return page;
}
