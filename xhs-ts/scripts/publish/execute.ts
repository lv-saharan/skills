/**
 * Publish command implementation
 *
 * @module publish/execute
 * @description Publish notes (image or video) to Xiaohongshu
 */

import { withProfile, randomStealthDelay } from '../browser';
import { resolveUser } from '../user/storage';
import { XhsError, XhsErrorCode } from '../shared';
import { TIMEOUTS } from '../shared';
import { XHS_URLS, debugLog, randomDelay } from '../utils/helpers';
import { ensureLogin } from '../login';
import { outputSuccess, outputError, outputFromError } from '../utils/output';
import type { PublishOptions } from './types';
import { validateMedia, validateContent } from './validation';
import { uploadMedia } from './uploader';
import { fillTitle, fillContent, addTags } from './editor';
import { submitAndVerify, clickPublishButtonOnHomepage } from './submitter';

// ============================================
// Constants
// ============================================

/** Page load timeout in milliseconds */
// Use TIMEOUTS.PAGE_LOAD from shared

// ============================================
// Main Publish Function
// ============================================

/**
 * Execute publish command
 */
export async function executePublish(options: PublishOptions): Promise<void> {
  const { title, content, mediaPaths, tags, headless, user } = options;
  const resolvedUser = user ?? resolveUser();

  debugLog(
    `Publish command: title="${title}", media=${mediaPaths.length} files, user=${resolvedUser}`
  );

  await withProfile(
    resolvedUser,
    async (page, profileResult) => {
      const { behavior, context } = profileResult;

      // Validate content
      debugLog('Validating content...');
      validateContent(title, content, tags);
      debugLog('Content validation passed');

      // Validate media
      debugLog('Validating media files...');
      const mediaValidation = validateMedia(mediaPaths);
      if (!mediaValidation.valid) {
        throw new XhsError(
          mediaValidation.error || 'Media validation failed',
          XhsErrorCode.VALIDATION_ERROR
        );
      }
      debugLog(`Media validation passed: type=${mediaValidation.type}`);

      // Navigate to homepage and verify login (Profile auto-loads persisted state)
      debugLog('Navigating to homepage...');
      await page.goto(XHS_URLS.home, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUTS.PAGE_LOAD,
      });
      await randomStealthDelay(behavior, 'read');

      // Ensure login (auto-login if needed)
      const loginResult = await ensureLogin(page, {
        user: resolvedUser,
        headless: headless ?? false,
        timeout: TIMEOUTS.LOGIN,
      });

      if (!loginResult.success) {
        throw new XhsError(loginResult.message || 'Not logged in', XhsErrorCode.NOT_LOGGED_IN);
      }

      // Click publish button on homepage to open creator center
      debugLog('Opening creator center from homepage...');
      const publishPage = await clickPublishButtonOnHomepage(page, context);

      if (!publishPage) {
        throw new XhsError('Failed to open creator center', XhsErrorCode.BROWSER_ERROR);
      }

      // Check if redirected to login page
      const currentUrl = publishPage.url();
      if (currentUrl.includes('login')) {
        throw new XhsError(
          'Creator center login required. Please run "xhs login --creator" first.',
          XhsErrorCode.NOT_LOGGED_IN
        );
      }

      debugLog('Creator center opened successfully');

      // Upload media
      debugLog('Uploading media files...');
      await uploadMedia(publishPage, mediaPaths, mediaValidation.type);
      debugLog('Media upload complete');

      // Fill in content
      debugLog('Filling title...');
      await fillTitle(publishPage, title);

      debugLog('Filling content...');
      await fillContent(publishPage, content);

      // Add tags if provided
      if (tags && tags.length > 0) {
        debugLog('Adding tags...');
        await addTags(publishPage, tags);
      }

      // Random delay before submit
      await randomDelay(1000, 2000);

      // Submit and verify
      debugLog('Submitting note...');
      const result = await submitAndVerify(publishPage);
      result.user = resolvedUser;

      debugLog('Publish complete, outputting result...');
      if (result.success) {
        outputSuccess(result, 'RELAY:发布成功');
      } else {
        outputError(result.message, XhsErrorCode.PUBLISH_FAILED);
      }
      debugLog('Result output complete');
    },
    { headless: headless ?? false }
  ).catch((error) => {
    debugLog('Publish error:', error);
    outputFromError(error);
  });
}
