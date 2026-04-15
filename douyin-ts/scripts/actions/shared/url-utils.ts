/**
 * URL extraction utilities for shared actions
 *
 * @module actions/shared/url-utils
 * @description Extract IDs from platform URLs - shared across all action modules
 */

import { isPlatformUrl } from '../../config';
import type { VideoIdExtraction, UserIdExtraction, UrlExtractionResult } from './url-types';

// ============================================
// Core URL Extraction
// ============================================

/**
 * Extract video ID from URL (core implementation)
 *
 * Supports:
 * - https://www.{domain}/explore/{videoId}
 * - https://www.{domain}/explore/{videoId}?xsec_token=xxx
 * - https://www.{domain}/discovery/item/{videoId}
 *
 * Does NOT support:
 * - Short links - will return error
 *
 * @param url - Video URL
 * @returns Extraction result with id or error
 */
export function extractVideoId(url: string): UrlExtractionResult {
  try {
    const urlObj = new URL(url);

    // Short links not supported
    if (urlObj.hostname === 'v.douyin.com') {
      return { success: false, error: '短链接不支持，请使用完整 URL' };
    }

    // Must be platform URL
    if (!isPlatformUrl(url)) {
      return { success: false, error: '非平台 URL' };
    }

    // Pattern 1: /explore/{videoId}
    const exploreMatch = urlObj.pathname.match(/\/explore\/([a-zA-Z0-9]+)/);
    if (exploreMatch && exploreMatch[1].length >= 20) {
      return { success: true, id: exploreMatch[1] };
    }

    // Pattern 2: /discovery/item/{videoId}
    const discoveryMatch = urlObj.pathname.match(/\/discovery\/item\/([a-zA-Z0-9]+)/);
    if (discoveryMatch && discoveryMatch[1].length >= 20) {
      return { success: true, id: discoveryMatch[1] };
    }

    return { success: false, error: '无法从 URL 提取视频 ID' };
  } catch {
    return { success: false, error: 'URL 格式无效' };
  }
}

/**
 * Extract user ID from URL (core implementation)
 *
 * Supports:
 * - https://www.{domain}/user/profile/{userId}
 *
 * Does NOT support:
 * - Short links - will return error
 *
 * @param url - User profile URL
 * @returns Extraction result with id or error
 */
export function extractUserId(url: string): UrlExtractionResult {
  try {
    const urlObj = new URL(url);

    // Short links not supported
    if (urlObj.hostname === 'v.douyin.com') {
      return { success: false, error: '短链接不支持，请使用完整 URL' };
    }

    // Must be platform URL
    if (!isPlatformUrl(url)) {
      return { success: false, error: '非平台 URL' };
    }

    // Pattern: /user/profile/{userId}
    const match = urlObj.pathname.match(/\/user\/profile\/([a-zA-Z0-9]+)/);
    if (match && match[1].length >= 20) {
      return { success: true, id: match[1] };
    }

    return { success: false, error: '无法从 URL 提取用户 ID' };
  } catch {
    return { success: false, error: 'URL 格式无效' };
  }
}

// ============================================
// Convenience Wrappers (with specific field names)
// ============================================

/**
 * Extract video ID from URL (returns VideoIdExtraction)
 *
 * @param url - Video URL
 * @returns Extraction result with videoId field
 */
export function extractVideoIdFromUrl(url: string): VideoIdExtraction {
  const result = extractVideoId(url);
  return {
    success: result.success,
    videoId: result.id,
    error: result.error,
  };
}

/**
 * Extract user ID from URL (returns UserIdExtraction)
 *
 * @param url - User profile URL
 * @returns Extraction result with userId field
 */
export function extractUserIdFromUrl(url: string): UserIdExtraction {
  const result = extractUserId(url);
  return {
    success: result.success,
    userId: result.id,
    error: result.error,
  };
}
