/**
 * Upload wait functions
 *
 * @module publish/uploader/upload-wait
 * @description Wait for image and video uploads to complete
 */

import { getTmpFilePath } from '../../../core/utils';
import type { Page } from 'playwright';
import { SkillError, SkillErrorCode } from '../../../config';
import { timeouts } from '../../../config';

/** Upload timeout in milliseconds */
const UPLOAD_TIMEOUT = timeouts.upload ?? 120000;
import { delay, debugLog, waitForCondition } from '../../../core/utils';
import { SELECTORS } from '../constants';
import { isOnLoginPage } from './login-detection';

// ============================================
// Image Upload Status Check
// ============================================

interface ImageUploadStatus {
  /** Upload completed successfully */
  completed: boolean;
  /** Need manual login and upload */
  needManualLogin: boolean;
  /** Login page detected - session lost */
  sessionLost: boolean;
  /** Upload error detected */
  hasError: boolean;
  /** Error message if any */
  errorMessage?: string;
}

/**
 * Check image upload status
 */
async function checkImageUploadStatus(page: Page): Promise<ImageUploadStatus> {
  // Check for login page
  const loginCheck = await isOnLoginPage(page);
  if (loginCheck.isLogin) {
    const url = page.url();
    if (url.includes('creator.xiaohongshu.com/login')) {
      return { completed: false, needManualLogin: true, sessionLost: false, hasError: false };
    }
    return { completed: false, needManualLogin: false, sessionLost: true, hasError: false };
  }

  // Check for editor textarea (upload complete)
  const titleSelectors = [
    'textarea[placeholder*="标题"]',
    'textarea[placeholder*="填写标题"]',
    '[contenteditable="true"][class*="title"]',
    '.title-input textarea',
  ];
  for (const selector of titleSelectors) {
    const visible = await page
      .locator(selector)
      .first()
      .isVisible()
      .catch(() => false);
    if (visible) {
      return { completed: true, needManualLogin: false, sessionLost: false, hasError: false };
    }
  }

  // Check for any textarea
  const anyTextarea = await page
    .locator('textarea, [contenteditable="true"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (anyTextarea) {
    return { completed: true, needManualLogin: false, sessionLost: false, hasError: false };
  }

  // Check for image preview
  const hasImagePreview = await page
    .locator(
      '[class*="preview"], [class*="thumbnail"], [class*="image-item"], img[src*="blob"], [class*="cover-item"]'
    )
    .isVisible()
    .catch(() => false);
  if (hasImagePreview) {
    await delay(2000);
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
      return { completed: true, needManualLogin: false, sessionLost: false, hasError: false };
    }
  }

  // Check for publish button
  const publishBtnVisible = await page
    .locator('button:has-text("发布")')
    .isVisible()
    .catch(() => false);
  if (publishBtnVisible) {
    return { completed: true, needManualLogin: false, sessionLost: false, hasError: false };
  }

  // Check for upload error
  const hasUploadError = await page
    .locator('[class*="upload-error"], .upload-failed, [class*="error"]')
    .isVisible()
    .catch(() => false);
  if (hasUploadError) {
    const errorText =
      (await page
        .locator('[class*="upload-error"], .upload-failed, [class*="error"]')
        .first()
        .textContent()
        .catch(() => null)) ?? 'Unknown error';
    return {
      completed: false,
      needManualLogin: false,
      sessionLost: false,
      hasError: true,
      errorMessage: errorText,
    };
  }

  return { completed: false, needManualLogin: false, sessionLost: false, hasError: false };
}

/**
 * Handle manual login and upload during image upload
 */
async function handleManualLoginAndWait(page: Page): Promise<void> {
  const creatorLoginOutput = {
    type: 'creator_login_required_during_upload',
    status: 'waiting_action',
    message: '上传过程中需要登录创作者中心',
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

  const LOGIN_WAIT_TIMEOUT = 180000; // 3 minutes

  try {
    await waitForCondition(
      async () => {
        await delay(2000);
        return await page
          .locator('textarea[placeholder*="标题"]')
          .isVisible()
          .catch(() => false);
      },
      {
        timeout: LOGIN_WAIT_TIMEOUT,
        interval: 2000,
        timeoutMessage: 'Creator center login/upload timeout',
        onProgress: (elapsed) => {
          if (elapsed % 10 === 0 && elapsed > 0) {
            debugLog(`[${elapsed}s] Waiting for user to login and upload manually...`);
          }
        },
      }
    );

    debugLog('Editor detected, user completed manual upload');
    const manualUploadSuccessOutput = {
      type: 'manual_upload_complete',
      status: 'success',
      message: '用户完成手动登录和上传',
    };
    console.log('\n✅ 检测到编辑器，上传成功！\n');
    console.log(JSON.stringify(manualUploadSuccessOutput));
  } catch {
    throw new SkillError(
      'Creator center login/upload timeout. Please try again.',
      SkillErrorCode.NOT_LOGGED_IN
    );
  }
}

/**
 * Wait for image upload to complete
 */
export async function waitForImageUpload(page: Page, imageCount: number): Promise<void> {
  debugLog(`Waiting for ${imageCount} image(s) to upload...`);

  let lastProgressLog = 0;

  try {
    await waitForCondition(
      async () => {
        const status = await checkImageUploadStatus(page);

        // Handle manual login needed
        if (status.needManualLogin) {
          await handleManualLoginAndWait(page);
          return true;
        }

        // Handle session lost
        if (status.sessionLost) {
          throw new SkillError(
            'SESSION_LOST_RETRY: Session was lost during upload.',
            SkillErrorCode.NOT_LOGGED_IN
          );
        }

        // Handle upload error
        if (status.hasError) {
          throw new SkillError(
            `Image upload failed: ${status.errorMessage}`,
            SkillErrorCode.NETWORK_ERROR
          );
        }

        // Log progress every 5 seconds
        const now = Date.now();
        if (now - lastProgressLog >= 5000) {
          debugLog(`[Image upload] Checking status...`);
          lastProgressLog = now;
        }

        return status.completed;
      },
      {
        timeout: UPLOAD_TIMEOUT,
        interval: 500,
        timeoutMessage: `Image upload timeout after ${UPLOAD_TIMEOUT / 1000}s`,
      }
    );

    debugLog('Image upload completed');
    await delay(1000);
  } catch (error) {
    // Take screenshot for debugging
    const screenshotPath = getTmpFilePath('upload-timeout-debug', 'png');
    // Safe to ignore - screenshot failure does not affect main flow
    await page.screenshot({ path: screenshotPath }).catch(() => {});

    if (error instanceof SkillError) {
      throw error;
    }

    throw new SkillError(
      `Image upload timeout after ${UPLOAD_TIMEOUT / 1000}s. Screenshot saved to ${screenshotPath}`,
      SkillErrorCode.NETWORK_ERROR
    );
  }
}

// ============================================
// Video Upload
// ============================================

/**
 * Wait for video upload to complete
 */
export async function waitForVideoUpload(page: Page): Promise<void> {
  try {
    await waitForCondition(
      async () => {
        // Check for video preview (success)
        const videoPreview = await page
          .locator('video, [class*="video-preview"], [class*="upload-complete"]')
          .isVisible()
          .catch(() => false);

        if (videoPreview) {
          debugLog('Video uploaded successfully');
          return true;
        }

        // Check for progress indicator
        const progressVisible = await page
          .locator(SELECTORS.uploadProgress)
          .isVisible()
          .catch(() => false);

        if (progressVisible) {
          const progressText =
            (await page
              .locator(SELECTORS.uploadProgress)
              .textContent()
              .catch(() => null)) ?? '';
          debugLog(`Upload progress: ${progressText}`);
        }

        // Check for error
        const hasError = await page
          .locator('[class*="upload-error"], [class*="error"]')
          .isVisible()
          .catch(() => false);

        if (hasError) {
          throw new SkillError('Video upload failed', SkillErrorCode.NETWORK_ERROR);
        }

        return false;
      },
      {
        timeout: UPLOAD_TIMEOUT,
        interval: 1000,
        timeoutMessage: 'Video upload timeout',
      }
    );
  } catch (error) {
    if (error instanceof SkillError) {
      throw error;
    }
    throw new SkillError('Video upload timeout', SkillErrorCode.NETWORK_ERROR);
  }
}
