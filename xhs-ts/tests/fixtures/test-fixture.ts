/**
 * Test fixture for authenticated page
 *
 * @module tests/fixtures/test-fixture
 * @description Provides authenticated page fixture for E2E tests
 */

import { test as base, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import { readFile } from 'fs/promises';
import { join } from 'path';

// ============================================
// Types
// ============================================

interface TestCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

// ============================================
// Fixtures
// ============================================

type TestFixtures = {
  authenticatedPage: Page;
  testCookies: TestCookie[];
};

export const test = base.extend<TestFixtures>({
  testCookies: async ({}, use) => {
    let cookies: TestCookie[] = [];
    try {
      const cookiePath = join(process.cwd(), 'users', 'default', 'cookies.json');
      const cookieData = await readFile(cookiePath, 'utf-8');
      const parsed = JSON.parse(cookieData);
      cookies = parsed.cookies || [];
    } catch {
      // No cookies available - tests will need to handle this
    }
    await use(cookies);
  },

  authenticatedPage: async ({ browser, testCookies }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    if (testCookies.length > 0) {
      await context.addCookies(testCookies);
    }

    await use(page);

    await context.close();
  },
});

export { expect };