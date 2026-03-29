/**
 * Video search with semantic filters
 * 
 * SELECTOR STRATEGY: 使用结构化提取，基于内容而非随机类名
 */
import type { Page } from 'playwright';
import type { VideoSearchOptions, VideoSearchResult, SearchOperationResult } from './types';
import { SEARCH_SELECTORS } from './selectors';
import { withAuthenticatedAction } from './shared';
import { delay, debugLog } from '../utils/helpers';
import { outputSuccess, outputFromError } from '../utils/output';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const SCROLL_DELAY = 1500;
const MAX_SCROLL_ATTEMPTS = 10;

export const VideoSortType = {
  COMPREHENSIVE: 'comprehensive',
  MOST_LIKES: 'most-likes',
  LATEST: 'latest',
} as const;
export type VideoSortTypeValue = typeof VideoSortType[keyof typeof VideoSortType];

export const PublishTimeType = {
  UNLIMITED: 'unlimited',
  ONE_DAY: 'one-day',
  ONE_WEEK: 'one-week',
  SIX_MONTHS: 'six-months',
} as const;
export type PublishTimeTypeValue = typeof PublishTimeType[keyof typeof PublishTimeType];

const SORT_NUMERIC: Record<VideoSortTypeValue, number> = { 'comprehensive': 0, 'most-likes': 1, 'latest': 2 };
const TIME_NUMERIC: Record<PublishTimeTypeValue, number> = { 'unlimited': 0, 'one-day': 1, 'one-week': 7, 'six-months': 180 };

function buildUrl(keyword: string, sortType: VideoSortTypeValue, publishTime: PublishTimeTypeValue): string {
  const enc = encodeURIComponent(keyword);
  let url = 'https://www.douyin.com/search/' + enc + '?type=video';
  const s = SORT_NUMERIC[sortType], t = TIME_NUMERIC[publishTime];
  if (s !== 0 || t !== 0) url += '&sort_type=' + s + '&publish_time=' + t;
  return url;
}

/**
 * 从视频卡片提取信息
 * 策略：基于 DOM 结构和内容特征，而非随机类名
 */
async function extractVideo(page: Page, card: any): Promise<VideoSearchResult | null> {
  try {
    return await card.evaluate((el: Element) => {
      // 1. 找到视频链接（最稳定的选择器）
      const link = el.querySelector('a[href*="/video/"]');
      if (!link) return null;
      
      const href = link.getAttribute('href') || '';
      const m = href.match(/\/video\/([a-zA-Z0-9]+)/);
      if (!m) return null;
      
      const videoId = m[1];
      const url = href.startsWith('http') ? href : 
        href.startsWith('//') ? 'https:' + href : 
        'https://www.douyin.com' + href;

      // 2. 获取所有文本行
      const allText = el.innerText || '';
      const lines = allText.split('\n').map(l => l.trim()).filter(l => l);

      // 3. 提取时长：匹配 HH:MM:SS 或 MM:SS 格式（通常是单独一行）
      let duration = '';
      for (const line of lines) {
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(line)) {
          duration = line;
          break;
        }
      }

      // 4. 提取点赞数：
      // 策略1：找包含 "万" 或 "亿" 的数字（最可能是点赞数）
      // 策略2：心形图标旁边的数字
      let likes = '';
      
      // 首先找包含 "万" 或 "亿" 的数字
      for (const line of lines) {
        if (/^\d+(\.\d+)?[万亿]$/.test(line)) {
          likes = line;
          break;
        }
      }
      
      // 如果没找到，尝试找心形 SVG 旁边的数字
      if (!likes) {
        const svg = el.querySelector('svg');
        if (svg) {
          const parent = svg.parentElement;
          if (parent) {
            const siblings = parent.querySelectorAll('span');
            siblings.forEach(span => {
              const text = span.textContent?.trim();
              if (text && /^\d+(\.\d+)?[万亿]?$/.test(text)) {
                likes = text;
              }
            });
          }
        }
      }

      // 5. 提取标题：较长的文本行（跳过统计和时间）
      let title = '';
      for (const line of lines) {
        if (/^\d+$/.test(line)) continue;
        if (/^\d{1,2}:\d{2}/.test(line)) continue;
        if (/^\d+(\.\d+)?[万亿]$/.test(line)) continue;
        if (line === '合集') continue;
        if (line.length < 5) continue;
        title = line;
        break;
      }

      // 6. 提取作者：@ 符号后的文本
      let author = '';
      for (const line of lines) {
        if (line.startsWith('@')) {
          author = line.substring(1).trim();
          break;
        }
      }

      // 7. 提取时间：匹配 "X天前"、"X周前"、"X小时前" 格式
      let timeAgo = '';
      for (const line of lines) {
        if (/^\d+[天周小时分钟]+前$/.test(line)) {
          timeAgo = line;
          break;
        }
      }

      // 8. 提取封面图片
      const img = el.querySelector('img');
      const coverUrl = img?.getAttribute('src') || '';

      // 9. 检查是否有合集标识
      const hasCollection = allText.includes('合集');

      return { 
        type: 'video' as const, 
        url, 
        videoId, 
        title, 
        author, 
        likes, 
        duration, 
        timeAgo, 
        coverUrl,
        hasCollection
      } as any;
    });
  } catch { return null; }
}

async function doSearch(page: Page, opts: VideoSearchOptions): Promise<SearchOperationResult> {
  const { keyword, sortType = 'comprehensive', publishTime = 'unlimited', limit = DEFAULT_LIMIT } = opts;
  const url = buildUrl(keyword, sortType, publishTime);
  
  debugLog('Search URL: ' + url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // 等待搜索结果加载
  await page.waitForSelector('.search-result-card, li:has(a[href*="/video/"])', { timeout: 10000 })
    .catch(() => debugLog('No video cards found initially'));
  await delay(2000);

  const results: VideoSearchResult[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (results.length < limit && attempts < MAX_SCROLL_ATTEMPTS) {
    const prevH = await page.evaluate(() => document.body.scrollHeight);
    
    // 使用结构化选择器找视频卡片
    const cards = await page.locator('.search-result-card:has(a[href*="/video/"]), li:has(a[href*="/video/"])').all();
    debugLog('Cards found: ' + cards.length);
    
    for (const c of cards) {
      if (results.length >= limit) break;
      const v = await extractVideo(page, c);
      if (v && !seen.has(v.videoId)) { 
        seen.add(v.videoId); 
        results.push(v); 
      }
    }
    
    if (results.length >= limit) break;
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
    await delay(SCROLL_DELAY);
    const currH = await page.evaluate(() => document.body.scrollHeight);
    if (currH === prevH) attempts++;
    else attempts = 0;
  }

  return { success: true, keyword, type: 'video', total: results.length, results: results.slice(0, limit) };
}

export async function executeSearchVideo(options: VideoSearchOptions): Promise<void> {
  const { keyword, sortType = 'comprehensive', publishTime = 'unlimited', limit = DEFAULT_LIMIT, headless, user } = options;
  
  if (!keyword?.trim()) { outputFromError(new Error('搜索关键词不能为空')); return; }
  
  const validSort = Object.values(VideoSortType);
  if (!validSort.includes(sortType as any)) { outputFromError(new Error('排序: ' + validSort.join(', '))); return; }
  
  const validTime = Object.values(PublishTimeType);
  if (!validTime.includes(publishTime as any)) { outputFromError(new Error('时间: ' + validTime.join(', '))); return; }

  try {
    await withAuthenticatedAction(headless, user, async (page) => {
      const result = await doSearch(page, options);
      outputSuccess({ ...result, user, filters: { sortType, publishTime } }, 'PARSE:search-video-results');
    });
  } catch (e) { debugLog('Error:', e); outputFromError(e); }
}
