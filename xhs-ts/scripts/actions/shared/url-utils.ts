/**
 * URL extraction utilities for shared actions
 *
 * @module actions/shared/url-utils
 * @description Extract IDs from platform URLs - shared across all action modules
 */

import { isPlatformUrl } from '../../config';
import type { NoteIdExtraction, UserIdExtraction, UrlExtractionResult } from './url-types';

// ============================================
// Core URL Extraction
// ============================================

/**
 * Extract note ID from URL (core implementation)
 *
 * Supports:
 * - https://www.{domain}/explore/{noteId}
 * - https://www.{domain}/explore/{noteId}?xsec_token=xxx
 * - https://www.{domain}/discovery/item/{noteId}
 *
 * Does NOT support:
 * - Short links (xhslink.com) - will return error
 *
 * @param url - Note URL
 * @returns Extraction result with id or error
 */
export function extractNoteId(url: string): UrlExtractionResult {
  try {
    const urlObj = new URL(url);

    // Short links not supported
    if (urlObj.hostname === 'xhslink.com') {
      return { success: false, error: '短链接不支持，请使用完整 URL' };
    }

    // Must be platform URL
    if (!isPlatformUrl(url)) {
      return { success: false, error: '非平台 URL' };
    }

    // Pattern 1: /explore/{noteId}
    const exploreMatch = urlObj.pathname.match(/\/explore\/([a-zA-Z0-9]+)/);
    if (exploreMatch && exploreMatch[1].length >= 20) {
      return { success: true, id: exploreMatch[1] };
    }

    // Pattern 2: /discovery/item/{noteId}
    const discoveryMatch = urlObj.pathname.match(/\/discovery\/item\/([a-zA-Z0-9]+)/);
    if (discoveryMatch && discoveryMatch[1].length >= 20) {
      return { success: true, id: discoveryMatch[1] };
    }

    return { success: false, error: '无法从 URL 提取笔记 ID' };
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
 * - Short links (xhslink.com) - will return error
 *
 * @param url - User profile URL
 * @returns Extraction result with id or error
 */
export function extractUserId(url: string): UrlExtractionResult {
  try {
    const urlObj = new URL(url);

    // Short links not supported
    if (urlObj.hostname === 'xhslink.com') {
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
 * Extract note ID from URL (returns NoteIdExtraction)
 *
 * @param url - Note URL
 * @returns Extraction result with noteId field
 */
export function extractNoteIdFromUrl(url: string): NoteIdExtraction {
  const result = extractNoteId(url);
  return {
    success: result.success,
    noteId: result.id,
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
