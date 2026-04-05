/**
 * Publish module constants
 *
 * @module publish/constants
 * @description Constants and selectors for publish functionality
 */

// ============================================
// Size Limits
// ============================================

/** Maximum title length */
export const MAX_TITLE_LENGTH = 20;

/** Maximum content length */
export const MAX_CONTENT_LENGTH = 1000;

/** Maximum number of images */
export const MAX_IMAGES = 9;

/** Maximum number of tags */
export const MAX_TAGS = 10;

/** Maximum tag length */
export const MAX_TAG_LENGTH = 10;

// ============================================
// File Constraints
// ============================================

/** Supported image extensions */
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/** Maximum image file size (32MB) */
export const MAX_IMAGE_SIZE = 32 * 1024 * 1024;

/** Supported video extensions */
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv'];

/** Maximum video file size (20GB for creator center) */
export const MAX_VIDEO_SIZE = 20 * 1024 * 1024 * 1024;

// Timeouts: Use TIMEOUTS from shared/constants
// PAGE_LOAD_TIMEOUT -> TIMEOUTS.PAGE_LOAD
// UPLOAD_TIMEOUT -> TIMEOUTS.UPLOAD

// ============================================
// URLs
// ============================================

/** Creator center publish URL */
export const CREATOR_PUBLISH_URL =
  'https://creator.xiaohongshu.com/publish/publish?source=official';

// ============================================
// Selectors
// ============================================

/** Page selectors */
export const SELECTORS = {
  // Tab switchers
  uploadVideoTab: 'text=上传视频',
  uploadImageTab: 'text=上传图文',

  // Upload inputs - these are hidden file inputs triggered by buttons
  fileInput: 'input[type="file"]',

  // Upload buttons (click to trigger file chooser)
  uploadImageButton: 'button:has-text("上传图片")',
  uploadVideoButton: 'button:has-text("上传视频")',

  // Text inputs (after upload, in editor)
  titleInput: 'textarea[placeholder*="标题"], [placeholder*="标题"]',
  contentInput: 'textarea, [contenteditable="true"], [class*="content"] textarea',

  // Tags
  topicButton: 'button:has-text("话题")',
  tagInput: 'input[placeholder*="话题"], input[placeholder*="标签"]',

  // Submit
  submitBtn: 'button:has-text("发布")',

  // Status indicators
  successIndicator: '.success, [class*="success"], .toast-success',
  publishSuccess: '.publish-success, [class*="published"]',

  // Error/Modal
  errorModal: '.error-modal, [class*="error"]',
  captchaModal: '.captcha, [class*="captcha"], iframe[src*="captcha"]',

  // Upload progress
  uploadProgress: '.upload-progress, [class*="progress"]',
  uploadComplete: '.upload-complete, [class*="complete"]',

  // Editor indicators
  editorLoaded: 'button:has-text("发布")',
};
