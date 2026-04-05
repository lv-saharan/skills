/**
 * URL extraction utilities for interact module
 *
 * @module interact/url-utils
 * @description Extract IDs from Xiaohongshu URLs
 */

// ============================================
// Types
// ============================================

/** Generic result of extracting an ID from URL */
export interface UrlExtractionResult {
  /** Successfully extracted */
  success: boolean;
  /** Extracted ID if found */
  id?: string;
  /** Error message if failed */
  error?: string;
}

/** Result of extracting note ID from URL */
export interface NoteIdExtraction {
  /** Successfully extracted */
  success: boolean;
  /** Note ID if found */
  noteId?: string;
  /** Error message if failed */
  error?: string;
}

/** Result of extracting user ID from URL */
export interface UserIdExtraction {
  /** Successfully extracted */
  success: boolean;
  /** User ID if found */
  userId?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================
// Core URL Extraction
// ============================================

/**
 * Extract note ID from URL (core implementation)
 *
 * Supports:
 * - https://www.xiaohongshu.com/explore/{noteId}
 * - https://www.xiaohongshu.com/explore/{noteId}?xsec_token=xxx
 * - https://www.xiaohongshu.com/discovery/item/{noteId}
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
      return { success: false, error: '短链接不支持，请使用完整URL' };
    }

    // Must be xiaohongshu.com
    if (!urlObj.hostname.includes('xiaohongshu.com')) {
      return { success: false, error: '非小红书URL' };
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

    return { success: false, error: '无法从URL提取笔记ID' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

/**
 * Extract user ID from URL (core implementation)
 *
 * Supports:
 * - https://www.xiaohongshu.com/user/profile/{userId}
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
      return { success: false, error: '短链接不支持，请使用完整URL' };
    }

    // Must be xiaohongshu.com
    if (!urlObj.hostname.includes('xiaohongshu.com')) {
      return { success: false, error: '非小红书URL' };
    }

    // Pattern: /user/profile/{userId}
    const match = urlObj.pathname.match(/\/user\/profile\/([a-zA-Z0-9]+)/);
    if (match && match[1].length >= 20) {
      return { success: true, id: match[1] };
    }

    return { success: false, error: '无法从URL提取用户ID' };
  } catch {
    return { success: false, error: 'URL格式无效' };
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
