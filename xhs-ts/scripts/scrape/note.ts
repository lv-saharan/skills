/**
 * Note scraping functionality
 *
 * @module scrape/note
 * @description Scrape detailed note information from Xiaohongshu
 */

import type { Page } from 'playwright';
import type { ScrapeNoteOptions, ScrapeNoteResult, NoteIdExtraction } from './types';
import { NOTE_SELECTORS, ERROR_SELECTORS } from './selectors';
import { XhsError, XhsErrorCode, TIMEOUTS } from '../shared';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { config, debugLog, delay, XHS_URLS } from '../utils/helpers';
import { checkCaptcha, checkLoginStatus, simulateReading } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';

// ============================================
// Constants
// ============================================

const PAGE_LOAD_TIMEOUT = 20000;
const DEFAULT_MAX_COMMENTS = 20;
const MAX_COMMENTS = 100;

// ============================================
// URL Parsing
// ============================================

/**
 * Extract note ID from URL
 * Supports:
 * - https://www.xiaohongshu.com/explore/{noteId}
 * - https://www.xiaohongshu.com/explore/{noteId}?xsec_token=xxx
 * - https://www.xiaohongshu.com/discovery/item/{noteId}
 */
export function extractNoteIdFromUrl(url: string): NoteIdExtraction {
  try {
    const urlObj = new URL(url);

    // Short links not supported
    if (urlObj.hostname === 'xhslink.com') {
      return { success: false, error: '短链接不支持，请使用完整URL' };
    }

    if (urlObj.hostname.includes('xiaohongshu.com')) {
      // Pattern 1: /explore/{noteId}
      const exploreMatch = urlObj.pathname.match(/\/explore\/([a-zA-Z0-9]+)/);
      if (exploreMatch && exploreMatch[1].length >= 20) {
        return { success: true, noteId: exploreMatch[1] };
      }

      // Pattern 2: /discovery/item/{noteId}
      const discoveryMatch = urlObj.pathname.match(/\/discovery\/item\/([a-zA-Z0-9]+)/);
      if (discoveryMatch && discoveryMatch[1].length >= 20) {
        return { success: true, noteId: discoveryMatch[1] };
      }
    }

    return { success: false, error: '无法从URL提取笔记ID，请检查URL格式' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

// ============================================
// Data Extraction
// ============================================

/**
 * Extract all note data from the page
 */
async function extractNoteData(
  page: Page,
  options: { includeComments: boolean; maxComments: number }
): Promise<Partial<ScrapeNoteResult>> {
  const { includeComments, maxComments } = options;

  return page.evaluate(
    ({ selectors, includeComments, maxComments }) => {
      // Helper to get text content
      const getText = (sel: string): string => {
        const el = document.querySelector(sel);
        return el?.textContent?.trim() || '';
      };

      // Helper to get attribute
      const getAttr = (sel: string, attr: string): string => {
        const el = document.querySelector(sel);
        return el?.getAttribute(attr) || '';
      };

      // Helper to get all matching elements' attribute
      const getAllAttr = (sel: string, attr: string): string[] => {
        return Array.from(document.querySelectorAll(sel))
          .map((el) => el.getAttribute(attr) || '')
          .filter(Boolean);
      };

      // Parse count
      const parseCountLocal = (text: string | null | undefined): number => {
        if (!text) {
          return 0;
        }
        const t = String(text).trim();
        if (!t) {
          return 0;
        }
        if (t.includes('万')) {
          return Math.floor(parseFloat(t) * 10000);
        }
        if (t.includes('w') || t.includes('W')) {
          return Math.floor(parseFloat(t) * 10000);
        }
        return parseInt(t.replace(/[^0-9]/g, ''), 10) || 0;
      };

      // Extract title
      let title = '';
      for (const sel of selectors.title.split(', ')) {
        const text = getText(sel);
        if (text) {
          title = text;
          break;
        }
      }

      // Extract content
      let content = '';
      for (const sel of selectors.content.split(', ')) {
        const text = getText(sel);
        if (text) {
          content = text;
          break;
        }
      }

      // Extract images
      const images: string[] = [];
      for (const sel of selectors.image.split(', ')) {
        const imgs = getAllAttr(sel, 'src');
        for (const src of imgs) {
          if (
            src &&
            !images.includes(src) &&
            (src.includes('xhscdn') || src.includes('xiaohongshu'))
          ) {
            images.push(src);
          }
        }
        if (images.length > 0) {
          break;
        }
      }

      // Check for video
      const videoEl = document.querySelector(selectors.video);
      let video: { url: string; cover: string; duration?: number } | undefined;
      if (videoEl) {
        const videoSrc =
          videoEl.getAttribute('src') ||
          document.querySelector(selectors.videoSource)?.getAttribute('src') ||
          '';
        const cover = videoEl.getAttribute('poster') || '';
        const duration = videoEl.duration || undefined;
        if (videoSrc || cover) {
          video = { url: videoSrc, cover, duration };
        }
      }

      // Determine type
      const type = video ? 'video' : 'image';

      // Extract author
      let authorId = '';
      const authorLinkEl = document.querySelector(selectors.authorLink);
      if (authorLinkEl) {
        const href = authorLinkEl.getAttribute('href') || '';
        const match = href.match(/\/user\/profile\/([a-zA-Z0-9]+)/);
        if (match) {
          authorId = match[1];
        }
      }

      const authorName = getText(selectors.authorName) || '未知作者';
      const authorAvatar = getAttr(selectors.authorAvatar, 'src') || '';
      const authorUrl = authorId ? `/user/profile/${authorId}` : '';

      // Extract stats
      const likes = parseCountLocal(getText(selectors.likeCount));
      const collects = parseCountLocal(getText(selectors.collectCount));
      const comments = parseCountLocal(getText(selectors.commentCount));
      const shares = parseCountLocal(getText(selectors.shareCount));

      // Extract tags
      const tags: string[] = [];
      const tagEls = document.querySelectorAll(selectors.tag);
      tagEls.forEach((el) => {
        const text = el.textContent?.trim();
        if (text && text.startsWith('#')) {
          tags.push(text.replace(/^#/, ''));
        } else if (text) {
          tags.push(text);
        }
      });

      // Extract metadata
      const publishTime = getText(selectors.publishTime);
      const location = getText(selectors.location);

      // Extract comments if requested
      let commentsData:
        | Array<{
            id: string;
            user: { id: string; name: string; avatar?: string };
            content: string;
            likes: number;
            time?: string;
            isAuthorReply?: boolean;
          }>
        | undefined;
      const totalComments = comments;

      if (includeComments) {
        commentsData = [];
        const commentEls = document.querySelectorAll(selectors.commentItem);
        let count = 0;
        for (const el of commentEls) {
          if (count >= maxComments) {
            break;
          }

          // Extract comment data
          const authorEl = el.querySelector(selectors.commentAuthor);
          const contentEl = el.querySelector(selectors.commentContent);
          const timeEl = el.querySelector(selectors.commentTime);
          const likesEl = el.querySelector(selectors.commentLikes);

          const userName = authorEl?.textContent?.trim() || '';
          const commentContent = contentEl?.textContent?.trim() || '';
          const commentTime = timeEl?.textContent?.trim() || '';
          const commentLikes = parseCountLocal(likesEl?.textContent);

          if (commentContent) {
            commentsData.push({
              id: `comment-${count}`,
              user: { id: '', name: userName },
              content: commentContent,
              likes: commentLikes,
              time: commentTime,
            });
            count++;
          }
        }
      }

      return {
        title,
        content,
        images,
        video,
        type,
        author: {
          id: authorId,
          name: authorName,
          avatar: authorAvatar,
          url: authorUrl,
        },
        stats: { likes, collects, comments, shares },
        tags,
        publishTime: publishTime || undefined,
        location: location || undefined,
        comments: commentsData,
        totalComments,
      };
    },
    {
      selectors: NOTE_SELECTORS,
      includeComments,
      maxComments,
    }
  );
}

/**
 * Check for error states on the page
 */
async function checkPageErrors(page: Page): Promise<string | null> {
  const content = await page.content();

  // Check for various error states
  if (content.includes('当前笔记暂时无法浏览') || content.includes('页面不见了')) {
    return '笔记不可访问';
  }
  if (content.includes('内容不存在')) {
    return '笔记不存在';
  }
  if (content.includes('该内容因违规无法查看')) {
    return '笔记因违规无法查看';
  }

  // Check for error selectors
  for (const sel of Object.values(ERROR_SELECTORS)) {
    const isVisible = await page
      .locator(sel)
      .first()
      .isVisible()
      .catch(() => false);
    if (isVisible) {
      return '页面出现错误';
    }
  }

  return null;
}

// ============================================
// Main Scrape Function
// ============================================

/**
 * Scrape note details from URL
 */
async function scrapeNote(
  page: Page,
  url: string,
  options: { includeComments: boolean; maxComments: number }
): Promise<ScrapeNoteResult> {
  debugLog('开始抓取笔记详情...');

  const extraction = extractNoteIdFromUrl(url);
  if (!extraction.success) {
    return {
      success: false,
      noteId: '',
      url,
      error: extraction.error,
      title: '',
      content: '',
      images: [],
      type: 'image',
      author: { id: '', name: '' },
      stats: { likes: 0, collects: 0, comments: 0, shares: 0 },
      tags: [],
      scrapedAt: new Date().toISOString(),
    };
  }

  const noteId = extraction.noteId!;

  try {
    // 1. Navigate to page
    debugLog('导航到: ' + url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT }).catch(() => {});
    await delay(1500 + Math.random() * 1000);

    // 2. Check for errors
    if (!(await checkLoginStatus(page))) {
      return {
        success: false,
        noteId,
        url,
        error: '需要登录才能查看此笔记',
        title: '',
        content: '',
        images: [],
        type: 'image',
        author: { id: '', name: '' },
        stats: { likes: 0, collects: 0, comments: 0, shares: 0 },
        tags: [],
        scrapedAt: new Date().toISOString(),
      };
    }

    if (await checkCaptcha(page)) {
      return {
        success: false,
        noteId,
        url,
        error: '检测到验证码',
        title: '',
        content: '',
        images: [],
        type: 'image',
        author: { id: '', name: '' },
        stats: { likes: 0, collects: 0, comments: 0, shares: 0 },
        tags: [],
        scrapedAt: new Date().toISOString(),
      };
    }

    const pageError = await checkPageErrors(page);
    if (pageError) {
      return {
        success: false,
        noteId,
        url,
        error: pageError,
        title: '',
        content: '',
        images: [],
        type: 'image',
        author: { id: '', name: '' },
        stats: { likes: 0, collects: 0, comments: 0, shares: 0 },
        tags: [],
        scrapedAt: new Date().toISOString(),
      };
    }

    // 3. Simulate human reading
    await simulateReading(page);

    // 4. Extract data
    debugLog('提取笔记数据...');
    const data = await extractNoteData(page, options);

    return {
      success: true,
      noteId,
      url,
      ...data,
      scrapedAt: new Date().toISOString(),
    } as ScrapeNoteResult;
  } catch (e) {
    return {
      success: false,
      noteId,
      url,
      error: e instanceof Error ? e.message : '未知错误',
      title: '',
      content: '',
      images: [],
      type: 'image',
      author: { id: '', name: '' },
      stats: { likes: 0, collects: 0, comments: 0, shares: 0 },
      tags: [],
      scrapedAt: new Date().toISOString(),
    };
  }
}

// ============================================
// Execute Function
// ============================================

/**
 * Execute scrape-note command
 */
export async function executeScrapeNote(options: ScrapeNoteOptions): Promise<void> {
  const { url, headless, user, includeComments = false, maxComments: rawMaxComments } = options;

  // Clamp max comments
  const maxComments = Math.min(Math.max(1, rawMaxComments || DEFAULT_MAX_COMMENTS), MAX_COMMENTS);

  debugLog(
    '抓取笔记: url=' +
      url +
      ', user=' +
      (user || 'default') +
      ', includeComments=' +
      includeComments
  );

  await withSession(
    async (session) => {
      // Load and validate cookies
      const cookies = await loadCookies(user);
      validateCookies(cookies);
      await session.context.addCookies(cookies);

      // Navigate to home first to establish session
      await session.page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
      await delay(2000);

      // Check login status
      if (!(await checkLoginStatus(session.page))) {
        throw new XhsError('未登录，请先执行 "xhs login"', XhsErrorCode.NOT_LOGGED_IN);
      }

      // Scrape the note
      const result = await scrapeNote(session.page, url, { includeComments, maxComments });
      result.user = user;

      // Output result
      if (!result.success && result.error) {
        outputSuccess(result, 'RELAY:' + result.error);
      } else {
        outputSuccess(result, 'PARSE:note');
      }
    },
    { headless: headless ?? config.headless }
  ).catch((error) => {
    debugLog('抓取笔记出错:', error);
    outputFromError(error);
  });
}
