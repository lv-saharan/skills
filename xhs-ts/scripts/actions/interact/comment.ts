/**
 * Comment functionality implementation
 *
 * @module interact/comment
 * @description Comment on a note on Xiaohongshu
 */

import type { Page } from 'playwright';
import type { CommentOptions, CommentResult } from './types';
import { COMMENT_SELECTORS } from '../shared/selectors';
import { extractNoteId } from '../shared/url-utils';
import { debugLog, delay, gaussianDelay } from '../../core/utils';
import { humanClick, humanScroll, humanType } from '../../core/anti-detect';
import { isLoggedIn } from '../auth/status';
import { outputSuccess, outputFromError } from '../../core/utils/output';
import { withSession, INTERACTION_DELAYS } from '../shared/session';
import { preparePageForAction } from '../shared/page-prep';
import { resolveUser } from '../../user';

// ============================================
// Constants
// ============================================

/** Extended input selectors for better coverage */
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

/** Error indicators that may appear after failed comment */
const COMMENT_ERROR_INDICATORS = [
  '绑定手机',
  '请先绑定',
  '需要绑定',
  '验证手机',
  '手机号',
  '请验证',
  '暂时无法评论',
  '评论失败',
  '操作频繁',
  '稍后再试',
];

// ============================================
// Helper Functions
// ============================================

/**
 * Check for error popups/messages after comment attempt
 */
async function checkCommentError(page: Page): Promise<string | null> {
  const pageContent = await page.content();

  // Check for error text in page
  for (const indicator of COMMENT_ERROR_INDICATORS) {
    if (pageContent.includes(indicator)) {
      return `评论受限: ${indicator}`;
    }
  }

  // Check for visible error modals/popups
  const errorSelectors = [
    '.modal-content:visible',
    '.popup-content:visible',
    '.error-message:visible',
    '.toast:visible',
    '[class*="modal"]:visible',
    '[class*="popup"]:visible',
    '[class*="toast"]:visible',
  ];

  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        const errorText = await element.textContent({ timeout: 1000 });
        if (errorText) {
          for (const indicator of COMMENT_ERROR_INDICATORS) {
            if (errorText.includes(indicator)) {
              return `评论受限: ${indicator}`;
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

// ============================================
// Core Comment Logic
// ============================================

async function performComment(
  page: Page,
  url: string,
  text: string,
  user: string
): Promise<CommentResult> {
  debugLog('开始执行评论...');

  const extraction = extractNoteId(url);
  if (!extraction.success) {
    return { success: false, url, noteId: '', text, error: extraction.error };
  }
  const noteId = extraction.id!;

  // Prepare page (navigate + check errors + simulate reading)
  const prep = await preparePageForAction(page, url, user);
  if (!prep.success) {
    return { success: false, url, noteId, text, error: prep.error };
  }

  // Scroll down to find comment section
  debugLog('滚动到评论区...');
  await humanScroll(page, { direction: 'down', distance: 500, speed: 'normal' });
  await delay(500);
  await humanScroll(page, { direction: 'down', distance: 300, speed: 'slow' });
  await delay(800);

  // Check for comment input directly
  let inputLocator = page.locator(COMMENT_INPUT_SELECTORS).first();
  let isInputVisible = await inputLocator.isVisible({ timeout: 3000 }).catch(() => false);

  // If input not found, try clicking comment button
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

  // Click on input to focus
  debugLog('点击评论输入框聚焦...');
  await inputLocator.click({ timeout: 3000 });
  await delay(300);

  // Type comment text
  debugLog('输入评论内容: ' + text);
  await humanType(inputLocator, text, {
    minDelay: 40,
    maxDelay: 100,
    thinkPauseChance: 0.1,
    typoChance: 0.02,
    clearFirst: false,
  });
  await delay(500 + Math.random() * 300);

  // Find submit button
  const submitLocator = page.locator(COMMENT_SUBMIT_SELECTORS).first();
  const isSubmitVisible = await submitLocator.isVisible({ timeout: 3000 }).catch(() => false);

  if (!isSubmitVisible) {
    return { success: false, url, noteId, text, error: '发送按钮未找到' };
  }

  // Check if submit button is disabled before clicking
  const isDisabled = await submitLocator.isDisabled({ timeout: 1000 }).catch(() => false);
  if (isDisabled) {
    return { success: false, url, noteId, text, error: '发送按钮不可用' };
  }

  // Click submit
  debugLog('点击发送按钮...');
  await submitLocator.click();
  await gaussianDelay(INTERACTION_DELAYS.batchInterval);

  // Check for error popup after clicking
  const errorResult = await checkCommentError(page);
  if (errorResult) {
    debugLog('检测到评论错误: ' + errorResult);
    return { success: false, url, noteId, text, error: errorResult };
  }

  // Check if still logged in after submitting
  if (!(await isLoggedIn(page))) {
    return { success: false, url, noteId, text, error: '需要登录才能评论' };
  }

  // Verify: check if input was cleared (indicates successful submit)
  const inputText = await inputLocator.textContent().catch(() => '');
  if (!inputText || !inputText.includes(text)) {
    // Double check for errors one more time
    const finalError = await checkCommentError(page);
    if (finalError) {
      return { success: false, url, noteId, text, error: finalError };
    }
    debugLog('评论发送成功');
    return { success: true, url, noteId, text };
  }

  // Input still has text - check for errors
  const remainingError = await checkCommentError(page);
  if (remainingError) {
    return { success: false, url, noteId, text, error: remainingError };
  }

  debugLog('评论操作完成，请确认结果');
  return { success: true, url, noteId, text };
}

// ============================================
// Main Execute Function
// ============================================

/**
 * Execute comment operation on a note
 */
export async function executeComment(options: CommentOptions): Promise<void> {
  const { url, text, headless, user } = options;
  const resolvedUser = user ?? resolveUser();

  debugLog('评论: url=' + url + ', text=' + text + ', user=' + resolvedUser);

  try {
    await withSession(
      user,
      async (ctx) => {
        const { page } = ctx;

        const result = await performComment(page, url, text, ctx.user);
        result.user = resolvedUser;

        if (!result.success && result.error) {
          outputSuccess(result, 'RELAY:' + result.error);
        } else {
          outputSuccess(result, 'RELAY:评论发送成功');
        }
      },
      { headless }
    );
  } catch (error) {
    debugLog('评论出错:', error);
    outputFromError(error);
  }
}
