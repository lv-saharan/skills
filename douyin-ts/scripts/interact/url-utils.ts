/**
 * URL extraction utilities for interact module
 *
 * @module interact/url-utils
 * @description Extract IDs from Douyin URLs
 */

import type { NoteIdExtraction, UserIdExtraction } from './types';

// ============================================
// Types
// ============================================

/** Result of extracting an ID from URL */
export interface UrlExtractionResult {
  /** Successfully extracted */
  success: boolean;
  /** Extracted ID if found */
  id?: string;
  /** Error message if failed */
  error?: string;
}

/** Douyin URL parse result */
export interface DouyinUrlParseResult {
  /** Successfully parsed */
  success: boolean;
  /** Video ID if found */
  videoId?: string;
  /** User ID if found */
  userId?: string;
  /** URL type */
  type?: 'video' | 'user' | 'short';
  /** Original URL */
  originalUrl: string;
  /** Resolved URL (for short links) */
  resolvedUrl?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================
// Video URL Extraction
// ============================================

/**
 * Extract video ID from Douyin URL
 *
 * Supports:
 * - https://www.douyin.com/video/{videoId}
 * - https://www.douyin.com/video/{videoId}?xxx
 *
 * Does NOT support:
 * - Short links (v.douyin.com) - will return error
 *
 * @param url - Video URL
 * @returns Extraction result with videoId or error
 */
export function extractVideoId(url: string): NoteIdExtraction {
  try {
    const urlObj = new URL(url);

    // Short links not supported (need redirect resolution)
    if (urlObj.hostname === 'v.douyin.com') {
      return { success: false, error: '短链接不支持，请使用完整URL' };
    }

    // Must be douyin.com
    if (!urlObj.hostname.includes('douyin.com')) {
      return { success: false, error: '非抖音URL' };
    }

    // Pattern: /video/{videoId}
    const videoMatch = urlObj.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
    if (videoMatch) {
      return { success: true, noteId: videoMatch[1] };
    }

    return { success: false, error: '无法从URL提取视频ID' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

// ============================================
// User URL Extraction
// ============================================

/**
 * Extract user ID from Douyin URL
 *
 * Supports:
 * - https://www.douyin.com/user/{userId}
 *
 * Does NOT support:
 * - Short links (v.douyin.com) - will return error
 *
 * @param url - User profile URL
 * @returns Extraction result with userId or error
 */
export function extractUserId(url: string): UserIdExtraction {
  try {
    const urlObj = new URL(url);

    // Short links not supported
    if (urlObj.hostname === 'v.douyin.com') {
      return { success: false, error: '短链接不支持，请使用完整URL' };
    }

    // Must be douyin.com
    if (!urlObj.hostname.includes('douyin.com')) {
      return { success: false, error: '非抖音URL' };
    }

    // Pattern: /user/{userId}
    const userMatch = urlObj.pathname.match(/\/user\/([a-zA-Z0-9]+)/);
    if (userMatch) {
      return { success: true, userId: userMatch[1] };
    }

    return { success: false, error: '无法从URL提取用户ID' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

// ============================================
// URL Parsing (Unified)
// ============================================

/**
 * Parse Douyin URL and extract relevant IDs
 *
 * Handles both video and user URLs, and identifies short links.
 *
 * @param url - Douyin URL
 * @returns Parse result with extracted IDs and URL type
 */
export function parseDouyinUrl(url: string): DouyinUrlParseResult {
  try {
    const urlObj = new URL(url);

    // Check if it's a Douyin URL
    if (!urlObj.hostname.includes('douyin.com')) {
      return { success: false, originalUrl: url, error: '非抖音URL' };
    }

    // Short link detection
    if (urlObj.hostname === 'v.douyin.com') {
      return {
        success: false,
        originalUrl: url,
        type: 'short',
        error: '短链接需要解析重定向，请使用完整URL',
      };
    }

    // Video URL
    const videoMatch = urlObj.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
    if (videoMatch) {
      return {
        success: true,
        videoId: videoMatch[1],
        type: 'video',
        originalUrl: url,
      };
    }

    // User URL
    const userMatch = urlObj.pathname.match(/\/user\/([a-zA-Z0-9]+)/);
    if (userMatch) {
      return {
        success: true,
        userId: userMatch[1],
        type: 'user',
        originalUrl: url,
      };
    }

    return { success: false, originalUrl: url, error: '无法识别URL类型' };
  } catch {
    return { success: false, originalUrl: url, error: 'URL格式无效' };
  }
}

// ============================================
// Legacy Exports (for backward compatibility)
// ============================================

/** @deprecated Use extractVideoId instead */
export function extractVideoIdLegacy(url: string): {
  success: boolean;
  videoId?: string;
  error?: string;
} {
  const result = extractVideoId(url);
  return {
    success: result.success,
    videoId: result.noteId,
    error: result.error,
  };
}

/** @deprecated Use extractUserId instead */
export function extractUserIdLegacy(url: string): {
  success: boolean;
  userId?: string;
  error?: string;
} {
  const result = extractUserId(url);
  return {
    success: result.success,
    userId: result.userId,
    error: result.error,
  };
}

// ============================================
// Alias exports for index.ts compatibility
// ============================================

/**
 * Alias for extractVideoId - used by index.ts
 * Note: Douyin uses "video" terminology, but we use "noteId" for consistency
 */
export const extractNoteId = extractVideoId;