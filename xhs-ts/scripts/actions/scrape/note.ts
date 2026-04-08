/**
 * Note scraping functionality
 *
 * @module actions/scrape/note
 * @description Scrape detailed note information from Xiaohongshu
 */

import type { Page } from 'playwright';
import type { ScrapeNoteOptions, ScrapeNoteResult } from './types';
import type { UserName } from '../../user';
import { extractNoteIdFromUrl } from '../shared/url-utils';
import { NOTE_SELECTORS } from '../shared/selectors';
import { withSession, type SessionContext } from '../shared/session';
import { preparePageForAction, checkContentErrors } from '../shared/page-prep';
import { debugLog, outputSuccess, outputFromError } from '../../core/utils';

// ============================================
// Constants
// ============================================

const DEFAULT_MAX_COMMENTS = 20;
const MAX_COMMENTS = 100;

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

// ============================================
// Main Scrape Function
// ============================================

/**
 * Scrape note details from URL
 */
async function scrapeNote(
  page: Page,
  url: string,
  user: UserName,
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
    // 1. Prepare page using unified API
    debugLog('Preparing page for scraping...');
    const prep = await preparePageForAction(page, url, user);

    if (!prep.success) {
      return createErrorResult(noteId, url, prep.error || '页面准备失败');
    }

    // 2. Check for content-specific errors
    const contentError = await checkContentErrors(page, 'note');
    if (contentError) {
      return createErrorResult(noteId, url, contentError);
    }

    // 3. Extract data
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
    return createErrorResult(noteId, url, e instanceof Error ? e.message : '未知错误');
  }
}

/**
 * Create error result object
 */
function createErrorResult(noteId: string, url: string, error: string): ScrapeNoteResult {
  return {
    success: false,
    noteId,
    url,
    error,
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

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;

        // Scrape the note
        const result = await scrapeNote(page, url, ctx.user, { includeComments, maxComments });
        result.user = ctx.user;

        // Output result
        if (!result.success && result.error) {
          outputSuccess(result, 'RELAY:' + result.error);
        } else {
          outputSuccess(result, 'PARSE:note');
        }
      },
      { headless: headless ?? false, autoCreate: true }
    );
  } catch (error) {
    debugLog('抓取笔记出错:', error);
    outputFromError(error);
  }
}
