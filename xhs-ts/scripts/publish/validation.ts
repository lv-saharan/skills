/**
 * Publish validation functions
 *
 * @module publish/validation
 * @description Validate media and content for publishing
 */

import { existsSync, statSync } from 'fs';
import { extname, resolve } from 'path';
import { XhsError, XhsErrorCode } from '../shared';
import type { MediaValidation } from './types';
import {
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_IMAGES,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from './constants';

// ============================================
// Media Validation
// ============================================

/**
 * Validate media files
 */
export function validateMedia(mediaPaths: string[]): MediaValidation {
  if (!mediaPaths || mediaPaths.length === 0) {
    return { valid: false, type: 'image', error: 'No media files provided' };
  }

  // Resolve to absolute paths
  const resolvedPaths = mediaPaths.map((p) => resolve(p));

  // Check all files exist
  for (const path of resolvedPaths) {
    if (!existsSync(path)) {
      return { valid: false, type: 'image', error: `File not found: ${path}` };
    }
  }

  // Determine media type
  const extensions = resolvedPaths.map((p) => extname(p).toLowerCase());
  const hasImages = extensions.some((ext) => IMAGE_EXTENSIONS.includes(ext));
  const hasVideos = extensions.some((ext) => VIDEO_EXTENSIONS.includes(ext));

  // Cannot mix images and videos
  if (hasImages && hasVideos) {
    return {
      valid: false,
      type: 'image',
      error: 'Cannot mix images and videos in a single note',
    };
  }

  // Validate images
  if (hasImages) {
    if (resolvedPaths.length > MAX_IMAGES) {
      return {
        valid: false,
        type: 'image',
        error: `Too many images: ${resolvedPaths.length} (max ${MAX_IMAGES})`,
      };
    }

    // Check all are valid image formats and sizes
    for (let i = 0; i < resolvedPaths.length; i++) {
      const ext = extensions[i];
      if (!IMAGE_EXTENSIONS.includes(ext)) {
        return {
          valid: false,
          type: 'image',
          error: `Unsupported image format: ${ext}. Supported: jpg, jpeg, png, webp`,
        };
      }

      // Check image file size
      const stats = statSync(resolvedPaths[i]);
      if (stats.size > MAX_IMAGE_SIZE) {
        return {
          valid: false,
          type: 'image',
          error: `Image file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max 32MB)`,
        };
      }
    }

    return { valid: true, type: 'image' };
  }

  // Validate videos
  if (hasVideos) {
    if (resolvedPaths.length > 1) {
      return {
        valid: false,
        type: 'video',
        error: 'Only one video file is allowed',
      };
    }

    const videoPath = resolvedPaths[0];
    const ext = extensions[0];

    if (!VIDEO_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        type: 'video',
        error: `Unsupported video format: ${ext}`,
      };
    }

    // Check video file size
    const stats = statSync(videoPath);
    if (stats.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        type: 'video',
        error: `Video file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max 500MB)`,
      };
    }

    return { valid: true, type: 'video' };
  }

  return { valid: false, type: 'image', error: 'No valid media files found' };
}

// ============================================
// Content Validation
// ============================================

/**
 * Validate publish content
 */
export function validateContent(title: string, content: string, tags?: string[]): void {
  // Title validation
  if (!title || title.trim().length === 0) {
    throw new XhsError('Title is required', XhsErrorCode.VALIDATION_ERROR);
  }

  if (title.length > MAX_TITLE_LENGTH) {
    throw new XhsError(
      `Title too long: ${title.length} chars (max ${MAX_TITLE_LENGTH})`,
      XhsErrorCode.VALIDATION_ERROR
    );
  }

  // Content validation
  if (!content || content.trim().length === 0) {
    throw new XhsError('Content is required', XhsErrorCode.VALIDATION_ERROR);
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    throw new XhsError(
      `Content too long: ${content.length} chars (max ${MAX_CONTENT_LENGTH})`,
      XhsErrorCode.VALIDATION_ERROR
    );
  }

  // Tags validation
  if (tags && tags.length > 0) {
    if (tags.length > MAX_TAGS) {
      throw new XhsError(
        `Too many tags: ${tags.length} (max ${MAX_TAGS})`,
        XhsErrorCode.VALIDATION_ERROR
      );
    }

    for (const tag of tags) {
      if (tag.length > MAX_TAG_LENGTH) {
        throw new XhsError(
          `Tag too long: "${tag}" (${tag.length} chars, max ${MAX_TAG_LENGTH})`,
          XhsErrorCode.VALIDATION_ERROR
        );
      }
    }
  }
}
