/**
 * Tab switching for upload
 *
 * @module publish/uploader/tab-switch
 * @description Switch between image and video upload tabs
 */

import { getTmpFilePath } from '../../config';
import type { Page } from 'playwright';
import { XhsError, XhsErrorCode } from '../../shared';
import { delay, debugLog } from '../../utils/helpers';
import type { PublishMediaType } from '../types';

/**
 * Switch to the correct upload tab (video or image)
 * Wait for the tab content to be fully loaded before returning
 */
export async function switchToUploadTab(page: Page, mediaType: PublishMediaType): Promise<void> {
  debugLog(`Switching to ${mediaType} upload tab`);

  const tabText = mediaType === 'image' ? '上传图文' : '上传视频';
  const uploadBtnText = mediaType === 'image' ? '上传图片' : '上传视频';

  try {
    // Wait for the page to be interactive
    await delay(500);

    // Resize viewport to ensure tabs are visible
    await page.setViewportSize({ width: 1400, height: 1000 }).catch(() => {});
    await delay(300);

    // First, check if the upload button is already visible (we might already be on the correct tab)
    const uploadBtn = page.locator(`button:has-text("${uploadBtnText}")`).first();
    const btnAlreadyVisible = await uploadBtn.isVisible().catch(() => false);

    if (btnAlreadyVisible) {
      debugLog(`${uploadBtnText} button already visible, already on correct tab`);
      return;
    }

    // Find and click the correct tab using evaluate (more reliable than Playwright click for this page)
    const tabClicked = await page.evaluate((text) => {
      // Method 1: Look for span.title elements (these are the tab labels)
      const spansWithTitle = document.querySelectorAll('span.title');
      for (const span of spansWithTitle) {
        if (span.textContent?.includes(text)) {
          (span as HTMLElement).click();
          return { success: true, method: 'span.title' };
        }
      }

      // Method 2: Find by text content directly
      const allSpans = document.querySelectorAll('span');
      for (const span of allSpans) {
        if (span.textContent?.trim() === text) {
          (span as HTMLElement).click();
          return { success: true, method: 'span text match' };
        }
      }

      // Method 3: Try generic elements with the tab text
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent?.trim() === text && el.tagName !== 'SCRIPT') {
          (el as HTMLElement).click();
          return { success: true, method: 'element text match' };
        }
      }

      return { success: false, method: 'tab_not_found' };
    }, tabText);

    debugLog(`Tab click result: ${JSON.stringify(tabClicked)}`);

    // Even if tab click failed, check if upload button is visible
    const btnVisible = await uploadBtn.isVisible().catch(() => false);

    if (btnVisible) {
      debugLog(`${uploadBtnText} button is visible, continuing...`);
      return;
    }

    if (!tabClicked.success) {
      // Take a screenshot for debugging
      const screenshotPath = getTmpFilePath('tab-switch-debug', 'png');
      await page.screenshot({ path: screenshotPath }).catch(() => {});

      // Check if we can find any upload button
      const imageBtnCount = await page.locator('button:has-text("上传图片")').count();
      const videoBtnCount = await page.locator('button:has-text("上传视频")').count();
      debugLog(`Button counts - Image: ${imageBtnCount}, Video: ${videoBtnCount}`);

      // If we're on the wrong tab (e.g., video tab but need image), try clicking the other tab
      if (mediaType === 'image' && videoBtnCount > 0 && imageBtnCount === 0) {
        debugLog('On video tab, clicking to switch to image tab...');
        // Try clicking the video tab to toggle
        const videoTab = page.locator('text=上传图文').first();
        await videoTab.click().catch(() => {});
        await delay(1000);

        // Check again
        const btnVisibleAfter = await uploadBtn.isVisible().catch(() => false);
        if (btnVisibleAfter) {
          debugLog('Tab switch successful');
          return;
        }
      }

      if (mediaType === 'video' && imageBtnCount > 0 && videoBtnCount === 0) {
        debugLog('On image tab, clicking to switch to video tab...');
        const imageTab = page.locator('text=上传视频').first();
        await imageTab.click().catch(() => {});
        await delay(1000);

        const btnVisibleAfter = await uploadBtn.isVisible().catch(() => false);
        if (btnVisibleAfter) {
          debugLog('Tab switch successful');
          return;
        }
      }

      // If no upload buttons found at all, the page might be different
      if (imageBtnCount === 0 && videoBtnCount === 0) {
        throw new XhsError(
          `No upload buttons found. The publish page structure may have changed or requires login.`,
          XhsErrorCode.NOT_FOUND
        );
      }

      // We're on the wrong tab but can't switch
      throw new XhsError(`Failed to find ${tabText} tab on publish page`, XhsErrorCode.NOT_FOUND);
    }

    // Wait for the tab content to load - wait for the upload button to be visible
    debugLog(`Waiting for ${uploadBtnText} button to appear...`);

    // Wait for URL to change (indicates tab switch)
    await page
      .waitForFunction(
        () =>
          window.location.href.includes('from=tab_switch') ||
          window.location.href.includes('publish'),
        { timeout: 5000 }
      )
      .catch(() => {});

    // Wait for the upload button to appear
    const btnVisibleAfter = await uploadBtn
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => null);

    if (!btnVisibleAfter) {
      debugLog(`Warning: ${uploadBtnText} button not visible after tab switch, but continuing...`);
    } else {
      debugLog(`${uploadBtnText} button is now visible`);
    }

    // Additional wait for content stability
    await delay(1500);

    debugLog(`Successfully switched to ${tabText} tab`);
  } catch (error) {
    debugLog(`Failed to switch tab: ${error}`);
    throw error;
  }
}
