/**
 * Publish module
 *
 * @module publish
 * @description Publish notes (image or video) to Xiaohongshu
 */

// Main function
export { executePublish } from './execute';

// Types
export type { PublishMediaType, PublishOptions, PublishResult, MediaValidation } from './types';

// Constants
export {
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_IMAGES,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  SELECTORS,
  CREATOR_PUBLISH_URL,
} from './constants';

// Uploader
export {
  uploadMedia,
  switchToUploadTab,
  isOnLoginPage,
  waitForUserLogin,
  waitForImageUpload,
  waitForVideoUpload,
} from './uploader';
