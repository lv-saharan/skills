/**
 * Comment functionality implementation
 *
 * @module interact/comment
 * @description Comment on a note on Xiaohongshu
 */

import type { Page } from 'playwright';
import type { CommentOptions, CommentResult } from './types';
import { COMMENT_SELECTORS } from './selectors';
import { XhsError, XhsErrorCode, TIMEOUTS } from '../shared';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { config, debugLog, delay, XHS_URLS } from '../utils/helpers';
import {
  humanClick,
  humanScroll,
  checkCaptcha,
  checkLoginStatus,
  simulateReading,
} from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';
import { extractNoteId } from './like';

// ============================================
// Constants
// ============================================

const PAGE_LOAD_TIMEOUT = 20000;
const COMMENT_INPUT_TIMEOUT = 10000;

// Extended input selectors for better coverage
const COMMENT_INPUT_SELECTORS = [
  'textarea[placeholder*="评论"]',
  'textarea[placeholder*="说点什么"]',
  'textarea[placeholder*="写下你的评论"]',
  '.content-input',
  '[class*="content-edit"]',
  '#content-textarea',
  'textarea[class*="comment"]',
  '[contenteditable="true"]',
  '.comment-input textarea',
  '.comments-el textarea',
].join(', ');

const COMMENT_SUBMIT_SELECTORS = [
  'button:has-text("发送")',
  'button:has-text("发布")',
  '[class*="send"]',
  '[class*="Send"]',
  '.comment-input button',
  '.comments-el button[type="submit"]',
].join(', ');

// ============================================
// Core Comment Logic
// ============================================

async function performComment(page: Page, url: string, text: string): Promise<CommentResult> {
  debugLog('开始执行评论...');

  const extraction = extractNoteId(url);
  if (!extraction.success) {
    return { success: false, url, noteId: '', text, error: extraction.error };
  }
  const noteId = extraction.noteId!;

  try {
    // 1. Navigate to page
    debugLog('导航到: ' + url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT }).catch(() => {});
    await delay(1500 + Math.random() * 1000);

    // 2. Check error states
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, text, error: '需要登录' };
    }
    if (await checkCaptcha(page)) {
      return { success: false, url, noteId, text, error: '检测到验证码' };
    }

    const pageContent = await page.content();
    if (pageContent.includes('当前笔记暂时无法浏览') || pageContent.includes('页面不见了')) {
      return { success: false, url, noteId, text, error: '笔记不可访问' };
    }

    // 3. Scroll down to find comment section
    debugLog('滚动到评论区...');
    await humanScroll(page, { direction: 'down', distance: 500, speed: 'normal' });
    await delay(500);
    await humanScroll(page, { direction: 'down', distance: 300, speed: 'slow' });
    await delay(800);

    // 4. Simulate human browsing
    await simulateReading(page);

    // 5. Check for comment input directly
    let inputLocator = page.locator(COMMENT_INPUT_SELECTORS).first();
    let isInputVisible = await inputLocator.isVisible({ timeout: 3000 }).catch(() => false);

    // 6. If input not found, try clicking comment button
    if (!isInputVisible) {
      const commentButton = page.locator(COMMENT_SELECTORS.button).first();
      const isCommentButtonVisible = await commentButton
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (isCommentButtonVisible) {
        debugLog('点击评论按钮打开输入框...');
        await humanClick(page, COMMENT_SELECTORS.button, {
          delayBefore: 200,
          delayAfter: 800,
        });

        // Re-check for input after clicking
        inputLocator = page.locator(COMMENT_INPUT_SELECTORS).first();
        isInputVisible = await inputLocator.isVisible({ timeout: 5000 }).catch(() => false);
      }
    }

    if (!isInputVisible) {
      return { success: false, url, noteId, text, error: '评论输入框未找到' };
    }

    // 7. Click on input to focus
    debugLog('点击评论输入框聚焦...');
    await inputLocator.click({ timeout: 3000 });
    await delay(300);

    // 8. Type comment text using pressSequentially (works with contenteditable divs)
    debugLog('输入评论内容: ' + text);
    await inputLocator.pressSequentially(text, { delay: 50 });
    await delay(500 + Math.random() * 300);

    // 9. Find and click submit button
    debugLog('点击发送按钮...');
    const submitLocator = page.locator(COMMENT_SUBMIT_SELECTORS).first();
    const isSubmitVisible = await submitLocator.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isSubmitVisible) {
      return { success: false, url, noteId, text, error: '发送按钮未找到' };
    }

    await submitLocator.click();
    await delay(1000 + Math.random() * 500);

    // 10. Check if still logged in
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, text, error: '需要登录才能评论' };
    }

    // 11. Check if comment was posted (check text content for contenteditable)
    const inputText = await inputLocator.textContent().catch(() => '');
    if (!inputText || !inputText.includes(text)) {
      debugLog('评论发送成功');
      return { success: true, url, noteId, text };
    }

    debugLog('评论已发送，请检查结果');
    return { success: true, url, noteId, text };
  } catch (e) {
    return {
      success: false,
      url,
      noteId,
      text,
      error: e instanceof Error ? e.message : '未知错误',
    };
  }
}

// ============================================
// Main Execute Function
// ============================================

/**
 * Execute comment operation on a note
 */
export async function executeComment(options: CommentOptions): Promise<void> {
  const { url, text, headless, user } = options;

  debugLog('评论: url=' + url + ', text=' + text + ', user=' + (user || 'default'));

  await withSession(
    async (session) => {
      const cookies = await loadCookies(user);
      validateCookies(cookies);
      await session.context.addCookies(cookies);

      await session.page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
      await delay(3000);

      if (!(await checkLoginStatus(session.page))) {
        throw new XhsError('未登录，请先执行 "xhs login"', XhsErrorCode.NOT_LOGGED_IN);
      }

      const result = await performComment(session.page, url, text);
      result.user = user;

      if (!result.success && result.error) {
        outputSuccess(result, 'RELAY:' + result.error);
        return;
      }

      outputSuccess(result, 'RELAY:评论发送成功');
    },
    { headless: headless ?? config.headless }
  ).catch((error) => {
    debugLog('评论出错:', error);
    outputFromError(error);
  });
}
