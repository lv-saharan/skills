/**
 * URL extraction utilities for interact module
 *
 * @module interact/url-utils
 * @description Extract IDs from Xiaohongshu URLs
 */

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

// ============================================
// Note URL Extraction
// ============================================

/**
 * Extract note ID from URL
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
 * @returns Extraction result with noteId or error
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
    if (exploreMatch) {
      return { success: true, id: exploreMatch[1] };
    }

    // Pattern 2: /discovery/item/{noteId}
    const discoveryMatch = urlObj.pathname.match(/\/discovery\/item\/([a-zA-Z0-9]+)/);
    if (discoveryMatch) {
      return { success: true, id: discoveryMatch[1] };
    }

    return { success: false, error: '无法从URL提取笔记ID' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

// ============================================
// User URL Extraction
// ============================================

/**
 * Extract user ID from URL
 *
 * Supports:
 * - https://www.xiaohongshu.com/user/profile/{userId}
 *
 * Does NOT support:
 * - Short links (xhslink.com) - will return error
 *
 * @param url - User profile URL
 * @returns Extraction result with userId or error
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
    if (match) {
      return { success: true, id: match[1] };
    }

    return { success: false, error: '无法从URL提取用户ID' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

// ============================================
// Legacy Exports (for backward compatibility)
// ============================================

/** @deprecated Use extractNoteId instead - returns { success, id?, error? } */
export function extractNoteIdLegacy(url: string): {
  success: boolean;
  noteId?: string;
  error?: string;
} {
  const result = extractNoteId(url);
  return {
    success: result.success,
    noteId: result.id,
    error: result.error,
  };
}

/** @deprecated Use extractUserId instead - returns { success, id?, error? } */
export function extractUserIdLegacy(url: string): {
  success: boolean;
  userId?: string;
  error?: string;
} {
  const result = extractUserId(url);
  return {
    success: result.success,
    userId: result.id,
    error: result.error,
  };
}
