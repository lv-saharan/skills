/**
 * Collect (bookmark) functionality implementation
 *
 * @module interact/collect
 * @description Collect (bookmark) one or multiple notes on Xiaohongshu using SVG use element detection
 */

import type { Page } from 'playwright';
import type { CollectOptions, CollectResult } from './types';
import { COLLECT_SELECTORS } from './selectors';
import { XhsError, XhsErrorCode, TIMEOUTS } from '../shared';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { config, debugLog, delay, gaussianDelay, XHS_URLS } from '../utils/helpers';
import { humanClick, checkCaptcha, checkLoginStatus, simulateReading } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';
import { extractNoteId } from './like';

// ============================================
// Constants
// ============================================

const PAGE_LOAD_TIMEOUT = 20000;

// ============================================
// Collect Status Detection (SVG use element)
// ============================================

/**
 * 通过 SVG use 元素的 xlink:href 判断收藏状态
 * - #collected = 已收藏
 * - #collect = 未收藏
 */
async function checkCollectStatus(page: Page): Promise<{ visible: boolean; collected: boolean }> {
  try {
    const wrapper = page.locator(COLLECT_SELECTORS.button).first();
    if (!(await wrapper.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { visible: false, collected: false };
    }

    // 检查 SVG use 元素的 href 属性
    const href = await page.evaluate(() => {
      const useEl = document.querySelector('.interact-container .collect-wrapper svg use');
      return useEl ? useEl.getAttribute('xlink:href') || useEl.getAttribute('href') : null;
    });

    if (!href) {
      return { visible: true, collected: false };
    }

    debugLog('Collect SVG use href: ' + href);
    return { visible: true, collected: href === '#collected' };
  } catch {
    return { visible: false, collected: false };
  }
}

// ============================================
// Core Collect Logic
// ============================================

async function performCollect(page: Page, url: string): Promise<CollectResult> {
  debugLog('开始执行收藏...');

  const extraction = extractNoteId(url);
  if (!extraction.success) {
    return { success: false, url, noteId: '', collected: false, error: extraction.error };
  }
  const noteId = extraction.noteId!;

  try {
    // 1. 导航到页面
    debugLog('导航到: ' + url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT }).catch(() => {});
    await delay(1500 + Math.random() * 1000);

    // 2. 检查错误状态（使用项目级 checkLoginStatus）
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, collected: false, error: '需要登录' };
    }
    if (await checkCaptcha(page)) {
      return { success: false, url, noteId, collected: false, error: '检测到验证码' };
    }

    const pageContent = await page.content();
    if (pageContent.includes('当前笔记暂时无法浏览') || pageContent.includes('页面不见了')) {
      return { success: false, url, noteId, collected: false, error: '笔记不可访问' };
    }

    // 3. 模拟人类浏览内容
    await simulateReading(page);

    // 4. 检查当前收藏状态
    const status = await checkCollectStatus(page);
    debugLog('状态: visible=' + status.visible + ', collected=' + status.collected);

    if (!status.visible) {
      return { success: false, url, noteId, collected: false, error: '收藏按钮未找到' };
    }

    // 已经收藏了，跳过点击，设置 alreadyCollected 标志
    if (status.collected) {
      debugLog('已收藏，跳过');
      return { success: true, url, noteId, collected: true, alreadyCollected: true };
    }

    // 5. 点击收藏按钮（使用项目级 humanClick）
    debugLog('准备点击收藏按钮...');
    const clicked = await humanClick(page, COLLECT_SELECTORS.button, {
      delayBefore: 200,
      delayAfter: 300,
    });

    if (!clicked) {
      return { success: false, url, noteId, collected: false, error: '点击失败' };
    }

    await delay(1000 + Math.random() * 500);

    // 6. 检查是否需要登录（使用项目级 checkLoginStatus）
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, collected: false, error: '需要登录才能收藏' };
    }

    // 7. 验证结果
    const finalStatus = await checkCollectStatus(page);
    debugLog('最终状态: collected=' + finalStatus.collected);

    return { success: finalStatus.collected, url, noteId, collected: finalStatus.collected };
  } catch (e) {
    return {
      success: false,
      url,
      noteId,
      collected: false,
      error: e instanceof Error ? e.message : '未知错误',
    };
  }
}

// ============================================
// Main Execute Function (Unified)
// ============================================

/**
 * Execute collect operation for one or multiple notes
 * - Single URL: output simple result
 * - Multiple URLs: output batch result with statistics
 */
export async function executeCollect(options: CollectOptions): Promise<void> {
  const { urls, headless, user, delayBetweenCollects } = options;
  const isSingle = urls.length === 1;

  debugLog('收藏: urls=' + urls.length + ', single=' + isSingle + ', user=' + (user || 'default'));

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

      const results: CollectResult[] = [];
      let succeeded = 0;
      let skipped = 0;
      let failed = 0;

      for (let i = 0; i < urls.length; i++) {
        const result = await performCollect(session.page, urls[i]);
        result.user = user;
        results.push(result);

        if (result.success) {
          result.alreadyCollected ? skipped++ : succeeded++;
        } else {
          failed++;
        }

        // Delay between collects (not after last one)
        if (i < urls.length - 1) {
          const delayMs = delayBetweenCollects ?? 2000;
          await gaussianDelay({ mean: delayMs, stdDev: delayMs * 0.25 });
        }
      }

      // Output format based on URL count
      if (isSingle) {
        const result = results[0];
        if (!result.success && result.error) {
          outputSuccess(result, 'RELAY:' + result.error);
          return;
        }
        if (result.alreadyCollected) {
          outputSuccess(result, 'RELAY:已经收藏过了，跳过');
        } else if (result.collected) {
          outputSuccess(result, 'RELAY:收藏成功');
        } else {
          outputSuccess(result, 'RELAY:收藏操作已执行，请检查结果');
        }
      } else {
        outputSuccess(
          { total: urls.length, succeeded, skipped, failed, results, user },
          'PARSE:results'
        );
      }
    },
    { headless: headless ?? config.headless }
  ).catch((error) => {
    debugLog('收藏出错:', error);
    outputFromError(error);
  });
}
