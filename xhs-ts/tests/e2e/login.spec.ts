import { test, expect } from '../fixtures/test-fixture';

/**
 * 登录模块 E2E 测试
 * 
 * 测试场景：
 * - Cookie 加载验证
 * - 登录状态检查
 * - 创作者中心登录
 */

test.describe('Login Module', () => {
  test('should have valid cookies loaded', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // 验证页面成功加载（表示 Cookie 有效）
    await expect(page).toHaveURL(/xiaohongshu\.com/);
    
    // 检查关键 Cookie 是否存在
    const cookies = await page.context().cookies();
    const hasA1 = cookies.some(c => c.name === 'a1');
    const hasWebSession = cookies.some(c => c.name === 'web_session');
    
    expect(hasA1 || hasWebSession).toBeTruthy();
  });

  test('should access creator center', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    // 导航到创作者中心
    await page.goto('https://creator.xiaohongshu.com');
    
    // 验证页面加载
    await expect(page).toHaveURL(/creator\.xiaohongshu\.com/);
    
    // 验证关键元素存在（表示登录成功）
    const publishButton = page.locator('[class*="publish"], button:has-text("发布")');
    // 如果找到发布按钮，表示登录成功
    const isPublishedVisible = await publishButton.count() > 0;
    expect(isPublishedVisible).toBeTruthy();
  });
});
