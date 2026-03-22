/**
 * Upload wait functions
 *
 * @module publish/uploader/upload-wait
 * @description Wait for image and video uploads to complete
 */

import { getTmpFilePath } from '../../config';
import type { Page } from 'playwright';
import { XhsError, XhsErrorCode } from '../../shared';
import { TIMEOUTS } from '../../shared';
import { delay, debugLog } from '../../utils/helpers';
import { SELECTORS } from '../constants';
import { isOnLoginPage } from './login-detection';

/**
 * Wait for image upload to complete
 */
export async function waitForImageUpload(page: Page, imageCount: number): Promise<void> {
  const startTime = Date.now();

  debugLog(`Waiting for ${imageCount} image(s) to upload...`);

  let uploadStarted = false;

  while (Date.now() - startTime < TIMEOUTS.UPLOAD) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // First check if we were redirected to login page
    const loginCheck = await isOnLoginPage(page);
    if (loginCheck.isLogin) {
      const url = page.url();

      // Check if it's creator center login page
      if (url.includes('creator.xiaohongshu.com/login')) {
        // Output structured status for agent
        const creatorLoginOutput = {
          type: 'creator_login_required_during_upload',
          status: 'waiting_action',
          message: '上传过程中需要登录创作者中心',
          reason: loginCheck.reason,
          suggestion: '请在浏览器窗口中登录并手动上传图片',
          manualAction: 'login_and_upload',
        };
        console.log('\n⚠️  上传过程中检测到创作者中心需要登录');
        console.log('📱 请在浏览器窗口中完成以下操作：');
        console.log('   1. 扫码或短信登录创作者中心');
        console.log('   2. 点击"上传图片"按钮');
        console.log('   3. 选择图片文件');
        console.log('   4. 等待图片上传完成，出现编辑器');
        console.log(JSON.stringify(creatorLoginOutput));

        // Wait for user to log in and manually upload
        const loginStartTime = Date.now();
        const LOGIN_WAIT_TIMEOUT = 180000; // 3 minutes

        while (Date.now() - loginStartTime < LOGIN_WAIT_TIMEOUT) {
          await delay(2000);

          // Check if editor appeared (user completed upload manually)
          const hasEditor = await page
            .locator('textarea[placeholder*="标题"]')
            .isVisible()
            .catch(() => false);

          if (hasEditor) {
            debugLog('Editor detected, user completed manual upload');

            // Output success status
            const manualUploadSuccessOutput = {
              type: 'manual_upload_complete',
              status: 'success',
              message: '用户完成手动登录和上传',
            };
            console.log('\n✅ 检测到编辑器，上传成功！\n');
            console.log(JSON.stringify(manualUploadSuccessOutput));

            return; // Upload completed successfully
          }

          const elapsed2 = Math.floor((Date.now() - loginStartTime) / 1000);
          if (elapsed2 % 10 === 0 && elapsed2 > 0) {
            debugLog(`[${elapsed2}s] Waiting for user to login and upload manually...`);
          }
        }

        throw new XhsError(
          'Creator center login/upload timeout. Please try again.',
          XhsErrorCode.NOT_LOGGED_IN
        );
      }

      // For main site login page during upload
      debugLog(`Detected login page: ${loginCheck.reason}`);
      throw new XhsError(
        'SESSION_LOST_RETRY: Session was lost during upload.',
        XhsErrorCode.NOT_LOGGED_IN
      );
    }

    // Check for upload progress indicators (image uploading)
    const progressIndicators = [
      '[class*="upload"]',
      '[class*="loading"]',
      '[class*="progress"]',
      '.uploading',
      '.ant-upload-list-item-uploading',
    ];

    let hasProgress = false;
    for (const selector of progressIndicators) {
      hasProgress = await page
        .locator(selector)
        .isVisible()
        .catch(() => false);
      if (hasProgress) {
        uploadStarted = true;
        break;
      }
    }

    // Check for the title input - multiple possible placeholders
    const titleSelectors = [
      'textarea[placeholder*="标题"]',
      'textarea[placeholder*="填写标题"]',
      '[contenteditable="true"][class*="title"]',
      '.title-input textarea',
    ];
    let titleVisible = false;
    for (const selector of titleSelectors) {
      titleVisible = await page
        .locator(selector)
        .first()
        .isVisible()
        .catch(() => false);
      if (titleVisible) {
        break;
      }
    }

    // Also check for any textarea (the editor might have different placeholder)
    const anyTextarea = await page
      .locator('textarea, [contenteditable="true"]')
      .first()
      .isVisible()
      .catch(() => false);

    // Check for image preview/thumbnails in editor (green blocks indicate upload success)
    const hasImagePreview = await page
      .locator(
        '[class*="preview"], [class*="thumbnail"], [class*="image-item"], img[src*="blob"], [class*="cover-item"]'
      )
      .isVisible()
      .catch(() => false);

    // Check for upload success indicator (green numbered blocks in editor)
    const hasUploadSuccess = await page
      .locator('[class*="imageItem"], [class*="image-item"], [class*="cover"]')
      .isVisible()
      .catch(() => false);

    // Check if publish button is visible (another indicator that editor is ready)
    const publishBtnVisible = await page
      .locator('button:has-text("发布")')
      .isVisible()
      .catch(() => false);

    // Log status every 5 seconds (skip first iteration at 0s)
    if (elapsed % 5 === 0 && elapsed > 0) {
      debugLog(
        `[${elapsed}s] uploadStarted=${uploadStarted}, hasProgress=${hasProgress}, titleVisible=${titleVisible}, anyTextarea=${anyTextarea}, hasImagePreview=${hasImagePreview}, hasUploadSuccess=${hasUploadSuccess}, publishBtnVisible=${publishBtnVisible}`
      );
    }

    // Success: title input or any textarea is visible (editor is ready)
    if (titleVisible || anyTextarea) {
      debugLog('Editor textarea appeared, editor is ready');
      await delay(1000); // Extra wait for stability
      return;
    }

    // Success if upload success indicator is visible (image uploaded and editor is ready)
    if (hasUploadSuccess || hasImagePreview) {
      debugLog('Image upload success indicator found, checking for editor...');
      await delay(2000);
      // Check again for textarea or publish button
      const textareaNow = await page
        .locator('textarea, [contenteditable="true"]')
        .first()
        .isVisible()
        .catch(() => false);
      const publishNow = await page
        .locator('button:has-text("发布")')
        .isVisible()
        .catch(() => false);
      if (textareaNow || publishNow) {
        debugLog('Editor is ready after upload success');
        return;
      }
    }

    // Success if publish button is visible (editor is ready even without detecting textarea)
    if (publishBtnVisible) {
      debugLog('Publish button visible, editor is ready');
      await delay(1000);
      return;
    }

    // Check for upload error
    const hasUploadError = await page
      .locator('[class*="upload-error"], .upload-failed, [class*="error"]')
      .isVisible()
      .catch(() => false);

    if (hasUploadError) {
      // Get error message if available
      const errorText = await page
        .locator('[class*="upload-error"], .upload-failed, [class*="error"]')
        .first()
        .textContent()
        .catch(() => 'Unknown error');
      throw new XhsError(`Image upload failed: ${errorText}`, XhsErrorCode.NETWORK_ERROR);
    }

    await delay(500);
  }

  // Timeout - take screenshot for debugging
  const screenshotPath = getTmpFilePath('upload-timeout-debug', 'png');
  await page.screenshot({ path: screenshotPath }).catch(() => {});

  throw new XhsError(
    `Image upload timeout after ${TIMEOUTS.UPLOAD / 1000}s. Screenshot saved to ${screenshotPath}`,
    XhsErrorCode.NETWORK_ERROR
  );
}

/**
 * Wait for video upload to complete
 */
export async function waitForVideoUpload(page: Page): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUTS.UPLOAD) {
    // Check for video preview
    const videoPreview = await page
      .locator('video, [class*="video-preview"], [class*="upload-complete"]')
      .isVisible()
      .catch(() => false);

    if (videoPreview) {
      debugLog('Video uploaded successfully');
      return;
    }

    // Check for progress indicator
    const progressVisible = await page
      .locator(SELECTORS.uploadProgress)
      .isVisible()
      .catch(() => false);

    if (progressVisible) {
      // Get progress percentage if available
      const progressText = await page
        .locator(SELECTORS.uploadProgress)
        .textContent()
        .catch(() => '');
      debugLog(`Upload progress: ${progressText}`);
    }

    // Check for error
    const hasError = await page
      .locator('[class*="upload-error"], [class*="error"]')
      .isVisible()
      .catch(() => false);

    if (hasError) {
      throw new XhsError('Video upload failed', XhsErrorCode.NETWORK_ERROR);
    }

    await delay(1000);
  }

  throw new XhsError('Video upload timeout', XhsErrorCode.NETWORK_ERROR);
}
