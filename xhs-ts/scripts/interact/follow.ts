/**
 * Follow functionality implementation
 *
 * @module interact/follow
 * @description Follow one or multiple users on Xiaohongshu using button text detection
 */

import type { Page } from 'playwright';
import type { FollowOptions, FollowResult, UserIdExtraction } from './types';
import { FOLLOW_SELECTORS } from './selectors';
import { XhsError, XhsErrorCode, TIMEOUTS } from '../shared';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { config, debugLog, delay, randomDelay, XHS_URLS } from '../utils/helpers';
import { humanClick, checkCaptcha, checkLoginStatus, simulateReading } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';

// ============================================
// Constants
// ============================================

const PAGE_LOAD_TIMEOUT = 20000;

// ============================================
// URL Parsing
// ============================================

export function extractUserId(url: string): UserIdExtraction {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'xhslink.com') {
      return { success: false, error: '短链接不支持，请使用完整URL' };
    }
    if (urlObj.hostname.includes('xiaohongshu.com')) {
      const m = urlObj.pathname.match(/\/user\/profile\/([a-zA-Z0-9]+)/);
      if (m) {
        return { success: true, userId: m[1] };
      }
    }
    return { success: false, error: '无法从URL提取用户ID' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

// ============================================
// Follow Status Detection
// ============================================

/**
 * 通过按钮文本判断关注状态
 * - "已关注" / "Following" = 已关注
 * - "关注" / "Follow" / "+ 关注" = 未关注
 */
async function checkFollowStatus(page: Page): Promise<{ visible: boolean; following: boolean }> {
  try {
    const wrapper = page.locator(FOLLOW_SELECTORS.button).first();
    if (!(await wrapper.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { visible: false, following: false };
    }

    // 检查按钮文本判断关注状态
    const buttonText = await page.evaluate(() => {
      const btn = document.querySelector(
        'button:has-text("关注"), [class*="follow-btn"], [class*="followBtn"]'
      );
      return btn ? btn.textContent?.trim() || '' : '';
    });

    if (!buttonText) {
      return { visible: true, following: false };
    }

    debugLog('Follow button text: ' + buttonText);

    // 检查是否已关注（按钮显示"已关注"或"Following"）
    const isFollowing =
      buttonText.includes('已关注') || buttonText.toLowerCase().includes('following');

    return { visible: true, following: isFollowing };
  } catch {
    return { visible: false, following: false };
  }
}

// ============================================
// Core Follow Logic
// ============================================

async function performFollow(page: Page, url: string): Promise<FollowResult> {
  debugLog('开始执行关注...');

  const extraction = extractUserId(url);
  if (!extraction.success) {
    return { success: false, url, userId: '', following: false, error: extraction.error };
  }
  const userId = extraction.userId!;

  try {
    // 1. 导航到页面
    debugLog('导航到: ' + url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT }).catch(() => {});
    await delay(1500 + Math.random() * 1000);

    // 2. 检查错误状态（使用项目级 checkLoginStatus）
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, userId, following: false, error: '需要登录' };
    }
    if (await checkCaptcha(page)) {
      return { success: false, url, userId, following: false, error: '检测到验证码' };
    }

    const pageContent = await page.content();
    if (pageContent.includes('用户不存在') || pageContent.includes('页面不见了')) {
      return { success: false, url, userId, following: false, error: '用户主页不可访问' };
    }

    // 3. 模拟人类浏览内容
    await simulateReading(page);

    // 4. 检查当前关注状态
    const status = await checkFollowStatus(page);
    debugLog('状态: visible=' + status.visible + ', following=' + status.following);

    if (!status.visible) {
      return { success: false, url, userId, following: false, error: '关注按钮未找到' };
    }

    // 已经关注了，跳过点击，设置 alreadyFollowing 标志
    if (status.following) {
      debugLog('已关注，跳过');
      return { success: true, url, userId, following: true, alreadyFollowing: true };
    }

    // 5. 点击关注按钮（使用项目级 humanClick）
    debugLog('准备点击关注按钮...');
    const clicked = await humanClick(page, FOLLOW_SELECTORS.button, {
      delayBefore: 200,
      delayAfter: 300,
    });

    if (!clicked) {
      return { success: false, url, userId, following: false, error: '点击失败' };
    }

    await delay(1000 + Math.random() * 500);

    // 6. 检查是否需要登录（使用项目级 checkLoginStatus）
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, userId, following: false, error: '需要登录才能关注' };
    }

    // 7. 验证结果
    const finalStatus = await checkFollowStatus(page);
    debugLog('最终状态: following=' + finalStatus.following);

    return { success: finalStatus.following, url, userId, following: finalStatus.following };
  } catch (e) {
    return {
      success: false,
      url,
      userId,
      following: false,
      error: e instanceof Error ? e.message : '未知错误',
    };
  }
}

// ============================================
// Main Execute Function (Unified)
// ============================================

/**
 * Execute follow operation for one or multiple users
 * - Single URL: output simple result
 * - Multiple URLs: output batch result with statistics
 */
export async function executeFollow(options: FollowOptions): Promise<void> {
  const { urls, headless, user, delayBetweenFollows } = options;
  const isSingle = urls.length === 1;

  debugLog('关注: urls=' + urls.length + ', single=' + isSingle + ', user=' + (user || 'default'));

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

      const results: FollowResult[] = [];
      let succeeded = 0;
      let skipped = 0;
      let failed = 0;

      for (let i = 0; i < urls.length; i++) {
        const result = await performFollow(session.page, urls[i]);
        result.user = user;
        results.push(result);

        if (result.success) {
          result.alreadyFollowing ? skipped++ : succeeded++;
        } else {
          failed++;
        }

        // Delay between follows (not after last one)
        if (i < urls.length - 1) {
          const delayMs = delayBetweenFollows ?? 2000;
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
        if (result.alreadyFollowing) {
          outputSuccess(result, 'RELAY:已经关注过了，跳过');
        } else if (result.following) {
          outputSuccess(result, 'RELAY:关注成功');
        } else {
          outputSuccess(result, 'RELAY:关注操作已执行，请检查结果');
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
    debugLog('关注出错:', error);
    outputFromError(error);
  });
}
