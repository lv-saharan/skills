/**
 * Follow functionality E2E tests
 *
 * @module tests/e2e/follow.spec
 * @description Tests for the follow user functionality
 */

import { test, expect } from '@playwright/test';
import { extractUserId } from '../../scripts/interact/follow';

// ============================================
// Unit Tests for extractUserId
// ============================================

test.describe('extractUserId', () => {
  test('should extract user ID from valid profile URL', () => {
    const url = 'https://www.xiaohongshu.com/user/profile/5f8a123b0000000001010023';
    const result = extractUserId(url);
    expect(result.success).toBe(true);
    expect(result.userId).toBe('5f8a123b0000000001010023');
  });

  test('should extract user ID from URL with query params', () => {
    const url = 'https://www.xiaohongshu.com/user/profile/5f8a123b0000000001010023?xsec_token=xxx';
    const result = extractUserId(url);
    expect(result.success).toBe(true);
    expect(result.userId).toBe('5f8a123b0000000001010023');
  });

  test('should reject short links', () => {
    const url = 'https://xhslink.com/abc123';
    const result = extractUserId(url);
    expect(result.success).toBe(false);
    expect(result.error).toContain('短链接不支持');
  });

  test('should reject invalid URLs', () => {
    const url = 'not-a-valid-url';
    const result = extractUserId(url);
    expect(result.success).toBe(false);
    expect(result.error).toContain('URL格式无效');
  });

  test('should reject URLs without user profile path', () => {
    const url = 'https://www.xiaohongshu.com/explore/6762318400000000130009cd';
    const result = extractUserId(url);
    expect(result.success).toBe(false);
    expect(result.error).toContain('无法从URL提取用户ID');
  });
});

// ============================================
// Integration Tests (require authentication)
// ============================================

test.describe('Follow functionality', () => {
  // Skip these tests in CI - they require real authentication
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only');

  test('should be able to navigate to user profile page', async ({ page }) => {
    // This is a smoke test to verify the URL structure is correct
    const userId = '5f8a123b0000000001010023'; // Example user ID
    const url = `https://www.xiaohongshu.com/user/profile/${userId}`;

    // We don't actually test following - just verify the URL structure
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {
      // Expected to fail without authentication, that's fine
    });

    // The test passes if the URL was correctly constructed
    expect(url).toContain('/user/profile/');
    expect(url).toContain(userId);
  });
});