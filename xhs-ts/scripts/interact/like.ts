/**
 * Like functionality implementation
 *
 * @module interact/like
 * @description Like one or multiple notes on Xiaohongshu using SVG use element detection
 */

import type { Page } from 'playwright';
import type { LikeOptions, LikeResult, NoteIdExtraction } from './types';
import { LIKE_SELECTORS } from './selectors';
import { XhsError, XhsErrorCode, TIMEOUTS } from '../shared';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { config, debugLog, delay, randomDelay, XHS_URLS } from '../utils/helpers';
import { humanClick, humanScroll, checkCaptcha, checkLoginStatus } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';

// ============================================
// Constants
// ============================================

const PAGE_LOAD_TIMEOUT = 20000;

// ============================================
// URL Parsing
// ============================================

export function extractNoteId(url: string): NoteIdExtraction {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'xhslink.com') {
      return { success: false, error: '短链接不支持，请使用完整URL' };
    }
    if (urlObj.hostname.includes('xiaohongshu.com')) {
      const m = urlObj.pathname.match(/\/explore\/([a-zA-Z0-9]+)/);
      if (m) {
        return { success: true, noteId: m[1] };
      }
      const m2 = urlObj.pathname.match(/\/discovery\/item\/([a-zA-Z0-9]+)/);
      if (m2) {
        return { success: true, noteId: m2[1] };
      }
    }
    return { success: false, error: '无法从URL提取笔记ID' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

// ============================================
// Like Status Detection (SVG use element)
// ============================================

/**
 * 通过 SVG use 元素的 xlink:href 判断点赞状态
 * - #liked = 已点赞
 * - #like = 未点赞
 */
async function checkLikeStatus(page: Page): Promise<{ visible: boolean; liked: boolean }> {
  try {
    const wrapper = page.locator(LIKE_SELECTORS.button).first();
    if (!(await wrapper.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { visible: false, liked: false };
    }

    const href = await page.evaluate(() => {
      const useEl = document.querySelector('.interact-container .like-wrapper svg use');
      return useEl ? useEl.getAttribute('xlink:href') || useEl.getAttribute('href') : null;
    });

    if (!href) {
      return { visible: true, liked: false };
    }

    debugLog('SVG use href: ' + href);
    return { visible: true, liked: href === '#liked' };
  } catch {
    return { visible: false, liked: false };
  }
}

// ============================================
// Human-like Reading Simulation
// ============================================

async function simulateReading(page: Page): Promise<void> {
  // 1. 随机移动鼠标到内容区域
  const viewport = page.viewportSize();
  if (viewport) {
    await page.mouse.move(
      Math.random() * viewport.width * 0.6 + viewport.width * 0.2,
      Math.random() * viewport.height * 0.6 + viewport.height * 0.2
    );
    await delay(100 + Math.random() * 200);
  }

  // 2. 随机悬停在图片上
  const images = await page.locator('img').all();
  if (images.length > 0) {
    const randomImg = images[Math.floor(Math.random() * Math.min(images.length, 5))];
    await randomImg.hover({ timeout: 2000 }).catch(() => {});
    await delay(500 + Math.random() * 1000);
  }

  // 3. 偶尔滚动一下（使用项目级 humanScroll）
  if (Math.random() > 0.5) {
    await humanScroll(page, {
      direction: Math.random() > 0.5 ? 'down' : 'up',
      distance: 100 + Math.random() * 200,
    });
  }

  // 4. 随机阅读时间
  await delay(1000 + Math.random() * 2000);
  debugLog('模拟浏览完成');
}

// ============================================
// Core Like Logic
// ============================================

async function performLike(page: Page, url: string): Promise<LikeResult> {
  debugLog('开始执行点赞...');

  const extraction = extractNoteId(url);
  if (!extraction.success) {
    return { success: false, url, noteId: '', liked: false, error: extraction.error };
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
      return { success: false, url, noteId, liked: false, error: '需要登录' };
    }
    if (await checkCaptcha(page)) {
      return { success: false, url, noteId, liked: false, error: '检测到验证码' };
    }

    const pageContent = await page.content();
    if (pageContent.includes('当前笔记暂时无法浏览') || pageContent.includes('页面不见了')) {
      return { success: false, url, noteId, liked: false, error: '笔记不可访问' };
    }

    // 3. 模拟人类浏览内容
    await simulateReading(page);

    // 4. 检查当前点赞状态
    const status = await checkLikeStatus(page);
    debugLog('状态: visible=' + status.visible + ', liked=' + status.liked);

    if (!status.visible) {
      return { success: false, url, noteId, liked: false, error: '点赞按钮未找到' };
    }

    // 已经点赞了，跳过点击，设置 alreadyLiked 标志
    if (status.liked) {
      debugLog('已点赞，跳过');
      return { success: true, url, noteId, liked: true, alreadyLiked: true };
    }

    // 5. 点击点赞按钮（使用项目级 humanClick）
    debugLog('准备点击点赞按钮...');
    const clicked = await humanClick(page, LIKE_SELECTORS.button, {
      delayBefore: 200,
      delayAfter: 300,
    });

    if (!clicked) {
      return { success: false, url, noteId, liked: false, error: '点击失败' };
    }

    await delay(1000 + Math.random() * 500);

    // 6. 检查是否需要登录（使用项目级 checkLoginStatus）
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, liked: false, error: '需要登录才能点赞' };
    }

    // 7. 验证结果
    const finalStatus = await checkLikeStatus(page);
    debugLog('最终状态: liked=' + finalStatus.liked);

    return { success: finalStatus.liked, url, noteId, liked: finalStatus.liked };
  } catch (e) {
    return {
      success: false,
      url,
      noteId,
      liked: false,
      error: e instanceof Error ? e.message : '未知错误',
    };
  }
}

// ============================================
// Main Execute Function (Unified)
// ============================================

/**
 * Execute like operation for one or multiple notes
 * - Single URL: output simple result
 * - Multiple URLs: output batch result with statistics
 */
export async function executeLike(options: LikeOptions): Promise<void> {
  const { urls, headless, user, delayBetweenLikes } = options;
  const isSingle = urls.length === 1;

  debugLog('点赞: urls=' + urls.length + ', single=' + isSingle + ', user=' + (user || 'default'));

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

      const results: LikeResult[] = [];
      let succeeded = 0;
      let skipped = 0;
      let failed = 0;

      for (let i = 0; i < urls.length; i++) {
        const result = await performLike(session.page, urls[i]);
        result.user = user;
        results.push(result);

        if (result.success) {
          result.alreadyLiked ? skipped++ : succeeded++;
        } else {
          failed++;
        }

        // Delay between likes (not after last one)
        if (i < urls.length - 1) {
          const delayMs = delayBetweenLikes ?? 2000;
          await randomDelay(delayMs, delayMs + 1000);
        }
      }

      // Output format based on URL count
      if (isSingle) {
        const result = results[0];
        if (!result.success && result.error) {
          outputSuccess(result, 'RELAY:' + result.error);
          return;
        }
        if (result.alreadyLiked) {
          outputSuccess(result, 'RELAY:已经点赞过了，跳过');
        } else if (result.liked) {
          outputSuccess(result, 'RELAY:点赞成功');
        } else {
          outputSuccess(result, 'RELAY:点赞操作已执行，请检查结果');
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
    debugLog('点赞出错:', error);
    outputFromError(error);
  });
}
