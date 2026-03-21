/**
 * Uploader module
 *
 * @module publish/uploader
 * @description Media upload logic for publish functionality
 */

// Main upload function
export { uploadMedia } from './upload';

// Tab switching
export { switchToUploadTab } from './tab-switch';

// Login detection
export { isOnLoginPage, waitForUserLogin } from './login-detection';

// Upload wait functions
export { waitForImageUpload, waitForVideoUpload } from './upload-wait';
