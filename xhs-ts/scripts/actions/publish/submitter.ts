/**
 * Publish submit functions
 *
 * @module publish/submitter
 * @description Submit and verification logic for publish functionality
 */

import type { BrowserContext, Page } from 'playwright';
import { SkillError, SkillErrorCode, timeouts, urls } from '../../config';
import { debugLog, delay, randomDelay } from '../../core/utils';
import { checkCaptcha } from '../../core/anti-detect';
import type { PublishResult } from './types';
import { SELECTORS, CREATOR_PUBLISH_URL } from './constants';

// ============================================
// Navigation Functions
// ============================================

/**
 * Click the publish button on homepage to open publish page in new tab
 * This maintains the session without requiring separate login
 * Returns the new page object
 */
export async function clickPublishButtonOnHomepage(
  page: Page,
  context: BrowserContext
): Promise<Page | null> {
  debugLog('Looking for publish button on homepage...');

  // Wait for page to be fully loaded
  await delay(2000);

  // The "发布" button is a link to creator center
  const publishLink = page.locator('a[href*="creator.xiaohongshu.com"]').first();

  try {
    const isVisible = await publishLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      debugLog('Found publish link, clicking...');

      // Listen for new page event ( clicking the link opens a new tab )
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 15000 }),
        publishLink.click(),
      ]);

      debugLog('New tab opened, waiting for it to load...');

      // Wait for the new page to load
      // Safe to ignore - page may already be loaded
      await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      await delay(2000);

      const newUrl = newPage.url();
      debugLog(`New page URL: ${newUrl}`);

      if (newUrl.includes('creator.xiaohongshu.com') && !newUrl.includes('login')) {
        debugLog('Successfully opened creator center in new tab');
        return newPage;
      }

      if (newUrl.includes('login')) {
        debugLog('New tab shows login page');
        return newPage; // Return the page anyway, caller will handle login
      }
    }
  } catch (error) {
    debugLog(`Error clicking publish button: ${error}`);
  }

  debugLog('Publish button not found or failed to open new tab');
  return null;
}

/**
 * Navigate to publish page from creator center homepage
 */
export async function navigateToPublishPageFromCreatorHome(page: Page): Promise<boolean> {
  debugLog('Looking for publish entry on creator center homepage...');

  await delay(1000);

  // On creator center homepage, look for publish button
  const publishSelectors = [
    'button:has-text("发布笔记")',
    'a:has-text("发布笔记")',
    '[class*="publish-btn"]',
    'a[href*="/publish"]',
  ];

  for (const selector of publishSelectors) {
    try {
      const button = page.locator(selector).first();
      const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        debugLog(`Found publish entry with selector: ${selector}`);
        await button.click();
        await delay(2000);

        const currentUrl = page.url();
        if (currentUrl.includes('/publish')) {
          debugLog('Successfully navigated to publish page');
          return true;
        }
      }
    } catch {
      // Continue
    }
  }

  // If not found, try direct navigation to publish URL
  debugLog('Trying direct navigation to publish page...');
  await page.goto(CREATOR_PUBLISH_URL, {
    waitUntil: 'domcontentloaded',
    timeout: timeouts.pageLoad,
  });

  await delay(2000);
  const currentUrl = page.url();

  if (currentUrl.includes('login')) {
    debugLog('Redirected to login page');
    return false;
  }

  return true;
}

// ============================================
// Submit Functions
// ============================================

/**
 * Click publish button and wait for result
 */
export async function submitAndVerify(page: Page): Promise<PublishResult> {
  debugLog('Submitting note...');

  // Check for captcha before submit
  const hasCaptcha = await checkCaptcha(page);
  if (hasCaptcha) {
    return {
      success: false,
      message:
        'CAPTCHA detected before submit. Please complete the CAPTCHA in the browser window and try again.',
    };
  }

  // Find and click submit button
  const submitBtn = page.locator(SELECTORS.submitBtn);
  const isVisible = await submitBtn.isVisible().catch(() => false);

  if (!isVisible) {
    throw new SkillError('Submit button not found', SkillErrorCode.NOT_FOUND);
  }

  const isEnabled = await submitBtn.isEnabled().catch(() => false);
  if (!isEnabled) {
    throw new SkillError(
      'Submit button is disabled. Please check if all required fields are filled.',
      SkillErrorCode.NOT_FOUND
    );
  }

  // Click the submit button
  await submitBtn.click();
  debugLog('Submit button clicked, waiting for result...');

  // Wait for result
  await randomDelay(2000, 3000);

  // Check for captcha after submit
  const captchaAfter = await checkCaptcha(page);
  if (captchaAfter) {
    return {
      success: false,
      message: 'CAPTCHA detected after submit. Please complete the CAPTCHA in the browser window.',
    };
  }

  // Check for success indicators
  const successIndicators = [
    '.toast:has-text("成功")',
    '[class*="success"]:visible',
    '.ant-message-success',
  ];

  for (const selector of successIndicators) {
    const isVisible = await page
      .locator(selector)
      .isVisible()
      .catch(() => false);
    if (isVisible) {
      debugLog('Success indicator found');

      // Try to extract note ID from URL
      const currentUrl = page.url();
      const noteIdMatch = currentUrl.match(/\/explore\/([a-zA-Z0-9]+)/);
      const noteId = noteIdMatch ? noteIdMatch[1] : undefined;

      return {
        success: true,
        noteId,
        noteUrl: noteId ? `${urls.explore}/${noteId}` : undefined,
        message: 'Note published successfully',
      };
    }
  }

  // Check for error
  const errorSelectors = [
    '[class*="error"]:visible',
    '.toast:has-text("失败")',
    '.ant-message-error',
  ];

  for (const selector of errorSelectors) {
    const isVisible = await page
      .locator(selector)
      .isVisible()
      .catch(() => false);
    if (isVisible) {
      const errorText = await page
        .locator(selector)
        .textContent()
        .catch(() => 'Unknown error');
      return {
        success: false,
        message: `Publish failed: ${errorText}`,
      };
    }
  }

  // Check if redirected to note page (success)
  const currentUrl = page.url();
  if (currentUrl.includes('/explore/')) {
    const noteIdMatch = currentUrl.match(/\/explore\/([a-zA-Z0-9]+)/);
    const noteId = noteIdMatch ? noteIdMatch[1] : undefined;

    return {
      success: true,
      noteId,
      noteUrl: noteId ? `${urls.explore}/${noteId}` : undefined,
      message: 'Note published successfully',
    };
  }

  // Check if redirected to creator center (likely success)
  if (currentUrl.includes('creator.xiaohongshu.com')) {
    return {
      success: true,
      message: 'Note submitted. Please check the creator center for status.',
    };
  }

  // Unknown state
  return {
    success: false,
    message: 'Publish status unknown. Please check the browser window.',
  };
}
