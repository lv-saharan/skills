/**
 * Publish command implementation
 *
 * @module actions/publish/execute
 * @description Publish notes (image or video) to Xiaohongshu
 */

import { withSession, type SessionContext } from '../shared/session';
import { SkillError, SkillErrorCode } from '../../config/errors';
import {
  debugLog,
  randomDelay,
  outputSuccess,
  outputError,
  outputFromError,
} from '../../core/utils';
import type { PublishOptions } from './types';
import { validateMedia, validateContent } from './validation';
import { uploadMedia } from './uploader';
import { fillTitle, fillContent, addTags } from './editor';
import { submitAndVerify, clickPublishButtonOnHomepage } from './submitter';

// ============================================
// Main Publish Function
// ============================================

/**
 * Execute publish command
 */
export async function executePublish(options: PublishOptions): Promise<void> {
  const { title, content, mediaPaths, tags, headless, user } = options;

  debugLog(
    `Publish command: title="${title}", media=${mediaPaths.length} files, user=${user || 'default'}`
  );

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;
        const context = page.context();

        // Validate content
        debugLog('Validating content...');
        validateContent(title, content, tags);
        debugLog('Content validation passed');

        // Validate media
        debugLog('Validating media files...');
        const mediaValidation = validateMedia(mediaPaths);
        if (!mediaValidation.valid) {
          throw new SkillError(
            mediaValidation.error || 'Media validation failed',
            SkillErrorCode.VALIDATION_ERROR
          );
        }
        debugLog(`Media validation passed: type=${mediaValidation.type}`);

        // withSession already navigated to home and verified login

        // Click publish button on homepage to open creator center
        debugLog('Opening creator center from homepage...');
        const publishPage = await clickPublishButtonOnHomepage(page, context);

        if (!publishPage) {
          throw new SkillError('Failed to open creator center', SkillErrorCode.BROWSER_ERROR);
        }

        // Use try-finally to ensure publishPage is closed (each action manages its own pages)
        try {
          // Check if redirected to login page
          const currentUrl = publishPage.url();
          if (currentUrl.includes('login')) {
            throw new SkillError(
              'Creator center login required. Please run "xhs login --creator" first.',
              SkillErrorCode.NOT_LOGGED_IN
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
          result.user = ctx.user;

          debugLog('Publish complete, outputting result...');
          if (result.success) {
            outputSuccess(result, 'RELAY:发布成功');
          } else {
            outputError(result.message, SkillErrorCode.PUBLISH_FAILED);
          }
          debugLog('Result output complete');
        } finally {
          // Close own publishPage
          if (!publishPage.isClosed()) {
            try {
              await publishPage.close({ runBeforeUnload: false });
              debugLog('Closed publishPage');
            } catch {
              // Page may already be closed
            }
          }
        }
      },
      { headless: headless ?? false, autoCreate: true }
    );
  } catch (error) {
    debugLog('Publish error:', error);
    outputFromError(error);
  }
}
