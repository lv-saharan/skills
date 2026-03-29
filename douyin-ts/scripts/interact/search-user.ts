/**
 * User search with semantic filters
 * 
 * SELECTOR STRATEGY: 使用结构化提取，基于内容而非随机类名
 */
import type { Page } from 'playwright';
import type { UserSearchOptions, UserSearchResult, SearchOperationResult } from './types';
import { SEARCH_SELECTORS } from './selectors';
import { withAuthenticatedAction } from './shared';
import { delay, debugLog } from '../utils/helpers';
import { outputSuccess, outputFromError } from '../utils/output';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const SCROLL_DELAY = 1500;
const MAX_SCROLL_ATTEMPTS = 10;

export const UserTypeFilter = {
  ALL: 'all',
  COMMON: 'common',
  ENTERPRISE: 'enterprise',
  VERIFIED: 'verified',
} as const;
export type UserTypeFilterValue = typeof UserTypeFilter[keyof typeof UserTypeFilter];

export const FollowerFilter = {
  ALL: 'all',
  UNDER_1K: 'under-1k',
  K_1_TO_10K: '1k-10k',
  K_10_TO_100K: '10k-100k',
  K_100K_TO_1M: '100k-1m',
  OVER_1M: 'over-1m',
} as const;
export type FollowerFilterValue = typeof FollowerFilter[keyof typeof FollowerFilter];

function buildUrl(keyword: string): string {
  return 'https://www.douyin.com/search/' + encodeURIComponent(keyword) + '?type=user';
}

/**
 * 从用户卡片提取信息
 * 策略：基于 DOM 结构和内容特征，而非随机类名
 */
async function extractUser(page: Page, card: any): Promise<UserSearchResult | null> {
  try {
    return await card.evaluate((el: Element) => {
      // 1. 找到用户链接（排除 /user/self）
      const link = el.querySelector('a[href*="/user/"]:not([href*="/user/self"])');
      if (!link) return null;
      
      const href = link.getAttribute('href') || '';
      // User ID 在 URL 路径中
      const m = href.match(/\/user\/([^?]+)/);
      if (!m) return null;
      
      const userId = m[1];
      const url = href.startsWith('http') ? href : 
        href.startsWith('//') ? 'https:' + href : 
        'https://www.douyin.com' + href;

      // 2. 提取所有文本内容
      const allText = el.innerText || '';
      const lines = allText.split('\n').map(l => l.trim()).filter(l => l);

      // 3. 提取昵称：第一行通常是昵称
      let nickname = lines[0] || '';

      // 4. 检查认证状态：查找 "认证" 关键词
      const verified = allText.includes('认证');

      // 5. 提取签名：最后一行长文本（非统计数据）
      let signature = '';
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        // 跳过统计信息、按钮文本等
        if (/^\d+/.test(line)) continue;
        if (line.includes('粉丝')) continue;
        if (line.includes('获赞')) continue;
        if (line.includes('关注')) continue;
        if (line === '认证徽章') continue;
        if (line.length < 2) continue;
        signature = line;
        break;
      }

      // 6. 提取头像
      const img = el.querySelector('img');
      const avatarUrl = img?.getAttribute('src') || '';

      return { 
        type: 'user' as const, 
        url, 
        userId, 
        nickname, 
        signature,
        verified,
        avatarUrl
      };
    });
  } catch { return null; }
}

async function doSearch(page: Page, opts: UserSearchOptions): Promise<SearchOperationResult> {
  const { keyword, limit = DEFAULT_LIMIT } = opts;
  const url = buildUrl(keyword);
  
  debugLog('User search URL: ' + url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // 等待用户卡片加载
  await page.waitForSelector('.search-result-card:has(a[href*="/user/"]:not([href*="/user/self"])), li:has(a[href*="/user/"]:not([href*="/user/self"]))', { timeout: 10000 })
    .catch(() => debugLog('No user cards found initially'));
  await delay(2000);

  const results: UserSearchResult[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (results.length < limit && attempts < MAX_SCROLL_ATTEMPTS) {
    const prevH = await page.evaluate(() => document.body.scrollHeight);
    
    // 使用结构化选择器找用户卡片
    const cards = await page.locator('.search-result-card:has(a[href*="/user/"]:not([href*="/user/self"])), li:has(a[href*="/user/"]:not([href*="/user/self"]))').all();
    debugLog('User cards found: ' + cards.length);
    
    for (const c of cards) {
      if (results.length >= limit) break;
      const u = await extractUser(page, c);
      if (u && !seen.has(u.userId)) { 
        seen.add(u.userId); 
        results.push(u); 
      }
    }
    
    if (results.length >= limit) break;
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
    await delay(SCROLL_DELAY);
    const currH = await page.evaluate(() => document.body.scrollHeight);
    if (currH === prevH) attempts++;
    else attempts = 0;
  }

  return { success: true, keyword, type: 'user', total: results.length, results: results.slice(0, limit) };
}

export async function executeSearchUser(options: UserSearchOptions): Promise<void> {
  const { keyword, limit = DEFAULT_LIMIT, headless, user } = options;
  
  if (!keyword?.trim()) { outputFromError(new Error('搜索关键词不能为空')); return; }

  try {
    await withAuthenticatedAction(headless, user, async (page) => {
      const result = await doSearch(page, options);
      outputSuccess({ ...result, user }, 'PARSE:search-user-results');
    });
  } catch (e) { debugLog('Error:', e); outputFromError(e); }
}
