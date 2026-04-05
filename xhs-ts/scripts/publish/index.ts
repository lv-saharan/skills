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

// Validation functions
export { validateMedia, validateContent } from './validation';

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

// Timeouts: Use TIMEOUTS from shared/constants
// import { TIMEOUTS } from '../shared';
// TIMEOUTS.PAGE_LOAD, TIMEOUTS.UPLOAD

// Upload functions (for advanced usage)
export {
  uploadMedia,
  switchToUploadTab,
  isOnLoginPage,
  waitForUserLogin,
  waitForImageUpload,
  waitForVideoUpload,
} from './uploader';

// Editor functions (for advanced usage)
export { fillTitle, fillContent, addTags } from './editor';

// Submitter functions (for advanced usage)
export {
  submitAndVerify,
  clickPublishButtonOnHomepage,
  navigateToPublishPageFromCreatorHome,
} from './submitter';
