import { test, expect } from '../fixtures/test-fixture';
import { waitForPageLoad, randomDelay } from '../utils/test-helpers';

/**
 * 搜索模块 E2E 测试
 * 
 * 测试场景：
 * - 正常搜索流程
 * - 搜索结果验证
 * - 空搜索结果处理
 * - 搜索排序功能
 */

test.describe('Search Module', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // 每个测试前确保页面就绪
    await waitForPageLoad(authenticatedPage);
  });

  test('should search notes successfully', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // 导航到搜索页
    await page.goto('https://www.xiaohongshu.com');
    
    // 查找搜索框并输入关键词
    const searchInput = page.locator('input[type="text"], input[placeholder*="搜索"]');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill('美食探店');
    
    // 模拟真实用户延迟
    await randomDelay(500, 1000);
    
    // 按下回车执行搜索
    await searchInput.press('Enter');
    
    // 等待搜索结果
    await expect(page.locator('.note-item, [class*="note"]')).toBeVisible({ timeout: 15000 });
    
    // 验证结果数量
    const notes = page.locator('.note-item, [class*="note"]');
    const count = await notes.count();
    expect(count).toBeGreaterThan(0);
    
    console.log(`✓ Found ${count} notes for "美食探店"`);
  });

  test('should handle empty search results', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // 使用不可能有结果的关键词
    await page.goto('https://www.xiaohongshu.com');
    
    const searchInput = page.locator('input[type="text"], input[placeholder*="搜索"]');
    await searchInput.fill('xyz123nonexistent');
    await searchInput.press('Enter');
    
    // 等待结果（可能为空）
    await page.waitForLoadState('networkidle');
    
    // 验证空结果或正常显示无结果提示
    const notes = page.locator('.note-item, [class*="note"]');
    const count = await notes.count();
    
    // 要么没有结果，要么显示无结果提示
    expect(count === 0 || await page.locator('[class*="empty"], [class*="no-result"]').count() > 0).toBeTruthy();
  });

  test('should support hot sorting', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('https://www.xiaohongshu.com');
    
    // 执行搜索
    const searchInput = page.locator('input[type="text"], input[placeholder*="搜索"]');
    await searchInput.fill('穿搭');
    await searchInput.press('Enter');
    
    // 等待搜索结果
    await expect(page.locator('.note-item, [class*="note"]')).toBeVisible({ timeout: 15000 });
    
    // 查找排序选项（热门）
    const sortButtons = page.locator('[class*="sort"], [class*="tab"]');
    const hotSort = sortButtons.filter({ hasText: /热门|最新/ }).first();
    
    // 如果找到排序按钮，点击并验证
    if (await hotSort.count() > 0) {
      await hotSort.click();
      await page.waitForLoadState('networkidle');
      
      // 验证排序后仍有结果
      const notes = page.locator('.note-item, [class*="note"]');
      expect(await notes.count()).toBeGreaterThan(0);
    }
  });
});
