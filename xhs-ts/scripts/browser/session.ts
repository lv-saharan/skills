/**
 * Browser session management
 *
 * @module browser/session
 * @description Robust browser session with AsyncDisposable support for `await using` syntax
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { BrowserLaunchOptions, BrowserSession, TrackedPage, CleanupResult } from './types';
import { launchBrowser } from './launch';
import { createContext } from './context';
import { debugLog } from '../utils/helpers';

// ============================================
// Tracked Page Implementation
// ============================================

class TrackedPageImpl implements TrackedPage {
  private _closed = false;

  constructor(
    public readonly page: Page,
    public readonly id: string
  ) {
    page.on('close', () => {
      this._closed = true;
    });
  }

  get isClosed(): boolean {
    return this._closed || this.page.isClosed();
  }

  async close(): Promise<void> {
    if (this._closed || this.page.isClosed()) {
      return;
    }
    try {
      await this.page.close();
      this._closed = true;
    } catch (error) {
      debugLog(`Error closing tracked page ${this.id}:`, error);
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

// ============================================
// Browser Session Implementation
// ============================================

export class BrowserSessionImpl implements BrowserSession {
  private _browser: Browser | null = null;
  private _context: BrowserContext | null = null;
  private _mainPage: Page | null = null;
  private _trackedPages: TrackedPageImpl[] = [];
  private _disposed = false;
  private _pageCounter = 0;

  get isActive(): boolean {
    return !this._disposed && this._browser !== null && this._browser.isConnected();
  }

  get browser(): Browser {
    this._assertActive();
    return this._browser!;
  }

  get context(): BrowserContext {
    this._assertActive();
    return this._context!;
  }

  get page(): Page {
    this._assertActive();
    return this._mainPage!;
  }

  get trackedPages(): readonly TrackedPage[] {
    return this._trackedPages;
  }

  static async create(options: BrowserLaunchOptions = {}): Promise<BrowserSessionImpl> {
    const session = new BrowserSessionImpl();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await launchBrowser(options);
      session._browser = browser;

      try {
        context = await createContext(browser, {
          proxy: options.proxy,
          stealth: options.stealth,
        });
        session._context = context;
      } catch (error) {
        await safeClose(browser, 'browser');
        session._browser = null;
        throw error;
      }

      try {
        session._mainPage = await context.newPage();
        const mainTracked = new TrackedPageImpl(session._mainPage, 'main');
        session._trackedPages.push(mainTracked);
      } catch (error) {
        await safeClose(context, 'context');
        await safeClose(browser, 'browser');
        session._context = null;
        session._browser = null;
        throw error;
      }

      session._setupAutoTracking();
      debugLog('Session: Created successfully');
      return session;
    } catch (error) {
      debugLog('Session: Creation failed, rolled back:', error);
      throw error;
    }
  }

  private _setupAutoTracking(): void {
    if (!this._context) {
      return;
    }
    this._context.on('page', (page: Page) => {
      if (page === this._mainPage) {
        return;
      }
      this._pageCounter++;
      const id = `auto-${this._pageCounter}`;
      const tracked = new TrackedPageImpl(page, id);
      this._trackedPages.push(tracked);
      page.on('close', () => {
        const index = this._trackedPages.indexOf(tracked);
        if (index > -1) {
          this._trackedPages.splice(index, 1);
        }
      });
    });
  }

  trackPage(page: Page, id?: string): TrackedPage {
    this._assertActive();
    const pageId = id ?? `manual-${++this._pageCounter}`;
    const tracked = new TrackedPageImpl(page, pageId);
    this._trackedPages.push(tracked);
    page.on('close', () => {
      const index = this._trackedPages.indexOf(tracked);
      if (index > -1) {
        this._trackedPages.splice(index, 1);
      }
    });
    return tracked;
  }

  async closePage(id: string): Promise<boolean> {
    const owned = this._trackedPages.find((p) => p.id === id);
    if (!owned || owned.isClosed) {
      return false;
    }
    try {
      await owned.close();
      const index = this._trackedPages.indexOf(owned);
      if (index > -1) {
        this._trackedPages.splice(index, 1);
      }
      return true;
    } catch (error) {
      debugLog(`Error closing page ${id}:`, error);
      return false;
    }
  }

  async closeExtraPages(): Promise<number> {
    let closed = 0;
    for (const tracked of this._trackedPages) {
      if (tracked.id !== 'main' && !tracked.isClosed) {
        try {
          await tracked.close();
          closed++;
        } catch (error) {
          debugLog(`Error closing extra page ${tracked.id}:`, error);
        }
      }
    }
    return closed;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }

  async dispose(): Promise<CleanupResult> {
    if (this._disposed) {
      return {
        pagesClosed: 0,
        contextClosed: false,
        browserClosed: false,
        errors: [],
        duration: 0,
      };
    }

    this._disposed = true;
    const startTime = Date.now();
    const result: CleanupResult = {
      pagesClosed: 0,
      contextClosed: false,
      browserClosed: false,
      errors: [],
      duration: 0,
    };

    debugLog('Session: Starting disposal...');

    while (this._trackedPages.length > 0) {
      const tracked = this._trackedPages.pop()!;
      if (!tracked.isClosed) {
        try {
          await tracked.close();
          result.pagesClosed++;
        } catch (e) {
          result.errors.push({
            resource: `page:${tracked.id}`,
            error: e instanceof Error ? e : new Error(String(e)),
          });
        }
      }
    }

    if (this._context) {
      try {
        await this._context.close();
        result.contextClosed = true;
      } catch (e) {
        result.errors.push({
          resource: 'context',
          error: e instanceof Error ? e : new Error(String(e)),
        });
      }
    }

    if (this._browser && this._browser.isConnected()) {
      try {
        await this._browser.close();
        result.browserClosed = true;
      } catch (e) {
        result.errors.push({
          resource: 'browser',
          error: e instanceof Error ? e : new Error(String(e)),
        });
      }
    }

    result.duration = Date.now() - startTime;
    debugLog(`Session: Disposal completed in ${result.duration}ms`);
    return result;
  }

  toBrowserInstance() {
    return { browser: this.browser, context: this.context, page: this.page };
  }

  private _assertActive(): void {
    if (this._disposed) {
      throw new Error('BrowserSession has been disposed');
    }
    if (!this._browser || !this._context || !this._mainPage) {
      throw new Error('BrowserSession not initialized');
    }
  }
}

async function safeClose(resource: { close(): Promise<void> } | null, name: string): Promise<void> {
  if (!resource) {
    return;
  }
  try {
    await resource.close();
    debugLog(`${name} closed (safe close)`);
  } catch (error) {
    debugLog(`Error closing ${name}:`, error);
  }
}

export async function withSession<T>(
  fn: (session: BrowserSessionImpl) => Promise<T>,
  options: BrowserLaunchOptions = {}
): Promise<T> {
  await using session = await BrowserSessionImpl.create(options);
  return await fn(session);
}
