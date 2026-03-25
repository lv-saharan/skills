/**
 * Publish command implementation
 *
 * @module publish/execute
 * @description Publish notes (image or video) to Xiaohongshu
 */

import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { XhsError, XhsErrorCode } from '../shared';
import { TIMEOUTS } from '../shared';
import { XHS_URLS, config, debugLog, delay, randomDelay } from '../utils/helpers';
import { checkLoginStatus } from '../utils/anti-detect';
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

  debugLog(`Publish command: title="${title}", media=${mediaPaths.length} files, user=${user}`);
  debugLog(`Headless mode: ${headless ?? config.headless}`);

  await withSession(
    async (session) => {
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

      // Load and validate cookies
      debugLog(`Loading and validating cookies for user: ${user || 'default'}...`);
      const cookies = await loadCookies(user);
      validateCookies(cookies);

      // Add cookies to context
      debugLog('Adding cookies to context...');
      await session.context.addCookies(cookies);

      // Navigate to homepage and verify login
      debugLog('Navigating to homepage...');
      await session.page.goto(XHS_URLS.home, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUTS.PAGE_LOAD,
      });
      await delay(2000);

      const isLoggedIn = await checkLoginStatus(session.page);
      debugLog(`Login status: ${isLoggedIn}`);

      if (!isLoggedIn) {
        throw new XhsError(
          'Not logged in or session expired. Please run "xhs login --creator" first.',
          XhsErrorCode.NOT_LOGGED_IN
        );
      }

      // Click publish button on homepage to open creator center
      debugLog('Opening creator center from homepage...');
      const publishPage = await clickPublishButtonOnHomepage(session.page, session.context);

      if (!publishPage) {
        throw new XhsError('Failed to open creator center', XhsErrorCode.BROWSER_ERROR);
      }

      // Track the publish page for automatic cleanup
      session.trackPage(publishPage, 'publish');

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
      result.user = user;

      debugLog('Publish complete, outputting result...');
      if (result.success) {
        outputSuccess(result, 'RELAY:发布成功');
      } else {
        outputError(result.message, XhsErrorCode.PUBLISH_FAILED);
      }
      debugLog('Result output complete');
    },
    { headless: headless ?? config.headless }
  ).catch((error) => {
    debugLog('Publish error:', error);
    outputFromError(error);
  });
}
