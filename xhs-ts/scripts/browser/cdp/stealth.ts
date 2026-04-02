/**
 * CDP Stealth Injection
 *
 * @module browser/cdp/stealth
 * @description Stealth script injection for CDP-connected browsers
 *
 * NOTE: Duplicate injection prevention is handled in browser context
 * via window.__XHS_STEALTH_INJECTED__ flag in stealth/utils.ts.
 * Node.js-side tracking (WeakSet) is ineffective because:
 * 1. Each CLI command runs in a new Node.js process
 * 2. Playwright creates new JS objects for each CDP connection
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { UserFingerprint } from '../../user/types';
import { generateStealthScript } from '../stealth';

// ============================================
// Types
// ============================================

export interface StealthInjectionOptions {
  fingerprint: UserFingerprint;
  enabled?: boolean;
}

// ============================================
// Stealth Injection
// ============================================

/**
 * Inject stealth script into a browser context
 *
 * The script includes its own duplicate prevention via
 * window.__XHS_STEALTH_INJECTED__ check in browser context.
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
 */
export async function injectStealthToPage(page: Page, fingerprint: UserFingerprint): Promise<void> {
  const script = generateStealthScript(fingerprint);
  const context = page.context();
  await context.addInitScript(script);
}

/**
 * Inject stealth into all existing contexts of a browser
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
 */
export async function createStealthContext(
  browser: Browser,
  fingerprint: UserFingerprint
): Promise<BrowserContext> {
  const context = await browser.newContext();
  await injectStealthToContext(context, fingerprint);
  return context;
}

/**
 * Create a stealth-injected page
 */
export async function createStealthPage(
  browser: Browser,
  fingerprint: UserFingerprint
): Promise<Page> {
  const contexts = browser.contexts();
  let context: BrowserContext;

  if (contexts.length > 0) {
    context = contexts[0];
  } else {
    context = await browser.newContext();
    await injectStealthToContext(context, fingerprint);
  }

  const page = await context.newPage();
  return page;
}
