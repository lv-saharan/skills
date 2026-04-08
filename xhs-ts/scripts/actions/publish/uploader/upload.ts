/**
 * Main upload function
 *
 * @module publish/uploader/upload
 * @description Perform media upload with retry logic
 */

import { resolve } from 'path';
import { getTmpFilePath } from '../../../core/utils';
import type { Page } from 'playwright';
import { SkillError, SkillErrorCode } from '../../../config';
import { timeouts } from '../../../config';
import { delay, debugLog, randomDelay } from '../../../core/utils';
import type { PublishMediaType } from '../types';
import { SELECTORS } from '../constants';
import { switchToUploadTab } from './tab-switch';
import { isOnLoginPage, waitForUserLogin } from './login-detection';
import { waitForImageUpload, waitForVideoUpload } from './upload-wait';

/**
 * Perform the actual file upload (internal function)
 */
async function performUpload(
  page: Page,
  mediaPaths: string[],
  mediaType: PublishMediaType
): Promise<void> {
  const uploadBtnText = mediaType === 'image' ? '上传图片' : '上传视频';
  const uploadBtn = page.locator(`button:has-text("${uploadBtnText}")`).first();

  debugLog(`Looking for ${uploadBtnText} button...`);

  // Check if upload button exists and is visible
  const btnVisible = await uploadBtn.isVisible().catch(() => false);
  debugLog(`${uploadBtnText} button visible: ${btnVisible}`);

  const resolvedPaths = mediaPaths.map((p) => resolve(p));

  if (!btnVisible) {
    // Take a screenshot for debugging
    const screenshotPath = getTmpFilePath('upload-btn-not-visible', 'png');
    // Safe to ignore - screenshot failure does not affect main flow
    await page.screenshot({ path: screenshotPath }).catch(() => {});

    // Check if we might be on the wrong tab
    const currentUrl = page.url();
    debugLog(`Current URL: ${currentUrl}`);

    // Try to find any upload button to see what tab we're on
    const imageBtnCount = await page.locator('button:has-text("上传图片")').count();
    const videoBtnCount = await page.locator('button:has-text("上传视频")').count();
    debugLog(`Button counts - Image: ${imageBtnCount}, Video: ${videoBtnCount}`);

    if (mediaType === 'image' && imageBtnCount === 0 && videoBtnCount > 0) {
      throw new SkillError(
        'Image upload button not found. You may be on the video tab. Please switch to the image tab first.',
        SkillErrorCode.NOT_FOUND
      );
    }

    if (mediaType === 'video' && videoBtnCount === 0 && imageBtnCount > 0) {
      throw new SkillError(
        'Video upload button not found. You may be on the image tab. Please switch to the video tab first.',
        SkillErrorCode.NOT_FOUND
      );
    }

    // Try file input as fallback
    const fileInput = page.locator(SELECTORS.fileInput);
    const inputCount = await fileInput.count();
    debugLog(`File input count: ${inputCount}`);

    if (inputCount > 0) {
      debugLog(`Setting files via input (fallback): ${resolvedPaths.join(', ')}`);
      await fileInput.first().setInputFiles(resolvedPaths);
    } else {
      throw new SkillError(
        'Upload input not found. The publish page may have changed.',
        SkillErrorCode.NOT_FOUND
      );
    }
  } else {
    // Use file chooser (click button) - more like real user behavior
    debugLog(`Clicking ${uploadBtnText} button to open file chooser...`);

    // Add a small delay before clicking (like a real user)
    await randomDelay(300, 800);

    // Use Promise.all to handle the file chooser
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 15000 }),
      uploadBtn.click(),
    ]);

    debugLog(`File chooser opened, setting files: ${resolvedPaths.join(', ')}`);
    await fileChooser.setFiles(resolvedPaths);
  }

  debugLog('Files selected, waiting for upload...');

  // Wait for upload to complete
  if (mediaType === 'video') {
    await waitForVideoUpload(page);
  } else {
    await waitForImageUpload(page, mediaPaths.length);
  }

  debugLog('Upload complete');
}

/**
 * Upload media files to publish page with retry on session loss
 */
export async function uploadMedia(
  page: Page,
  mediaPaths: string[],
  mediaType: PublishMediaType
): Promise<void> {
  debugLog(`Uploading ${mediaType} files: ${mediaPaths.length}`);

  // Maximum retry attempts
  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      // Switch to correct tab first
      await switchToUploadTab(page, mediaType);

      // Wait for upload area to be ready
      await delay(2000);

      // Take a screenshot for debugging
      const screenshotPath = getTmpFilePath('upload-debug', 'png');
      // Safe to ignore - screenshot failure does not affect main flow
      await page.screenshot({ path: screenshotPath }).catch(() => {});
      debugLog(`Screenshot saved to ${screenshotPath}`);

      // Check if we're on login page before attempting upload
      const loginCheck = await isOnLoginPage(page);
      if (loginCheck.isLogin) {
        debugLog(`On login page before upload attempt: ${loginCheck.reason}`);
        await waitForUserLogin(page);
        // After login, need to re-navigate (caller handles this)
        continue;
      }

      // Try automated upload
      await performUpload(page, mediaPaths, mediaType);

      // Take another screenshot after upload
      await delay(1000);
      const screenshotPath2 = getTmpFilePath('upload-after', 'png');
      // Safe to ignore - screenshot failure does not affect main flow
      await page.screenshot({ path: screenshotPath2 }).catch(() => {});
      debugLog(`Screenshot after upload saved to ${screenshotPath2}`);

      // Upload successful, break out of retry loop
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if this is a retry-able error (creator login during upload)
      if (errorMessage.includes('RETRY_UPLOAD_AFTER_LOGIN')) {
        retryCount++;
        debugLog(`Upload interrupted by login, retrying... (attempt ${retryCount}/${MAX_RETRIES})`);
        continue;
      }

      // If session was lost, prompt user to upload manually
      if (errorMessage.includes('SESSION_LOST_RETRY') || errorMessage.includes('login')) {
        debugLog('Session lost during upload, prompting user to upload manually');

        console.log('\n⚠️  检测到安全验证。');
        console.log('📱 请在浏览器窗口中手动完成以下操作：\n');
        console.log('   1. 如需登录，请扫码登录');
        console.log('   2. 点击"上传图片"按钮');
        console.log(`   3. 选择图片: ${mediaPaths.join(', ')}`);
        console.log('   4. 等待图片上传完成\n');
        console.log('上传完成后，按 Enter 键继续 (120秒超时)...\n');

        // Wait for user to press Enter with timeout
        const MANUAL_UPLOAD_TIMEOUT = timeouts.login; // 2 minutes
        await Promise.race([
          new Promise<void>((resolve) => {
            process.stdin.once('data', () => {
              resolve();
            });
          }),
          new Promise<void>((_, reject) => {
            setTimeout(() => {
              reject(new SkillError('Manual upload timeout', SkillErrorCode.NETWORK_ERROR));
            }, MANUAL_UPLOAD_TIMEOUT);
          }),
        ]).catch((err) => {
          throw err;
        });

        // Check if upload was successful
        const hasEditor = await page
          .locator('textarea[placeholder*="标题"]')
          .isVisible()
          .catch(() => false);
        if (!hasEditor) {
          // Check if we need to wait more for editor to appear
          await delay(3000);
        }

        debugLog('User completed manual upload, continuing...');
        return; // Manual upload completed
      }

      // Non-retryable error, throw it
      throw error;
    }
  }

  throw new SkillError(`Upload failed after ${MAX_RETRIES} retries`, SkillErrorCode.NETWORK_ERROR);
}
