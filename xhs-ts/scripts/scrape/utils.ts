/**
 * Scrape module utilities
 *
 * @module scrape/utils
 * @description Common utilities for scraping operations
 */

import type { ScrapeNoteResult, ScrapeUserResult } from './types';

// ============================================
// Error Result Factories
// ============================================

/**
 * Create an error result for note scraping
 *
 * @param noteId - Note ID (can be empty if extraction failed)
 * @param url - Original URL
 * @param error - Error message
 * @returns Partial ScrapeNoteResult with error
 */
export function createNoteErrorResult(
  noteId: string,
  url: string,
  error: string
): ScrapeNoteResult {
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

/**
 * Create an error result for user scraping
 *
 * @param userId - User ID (can be empty if extraction failed)
 * @param url - Original URL
 * @param error - Error message
 * @returns Partial ScrapeUserResult with error
 */
export function createUserErrorResult(
  userId: string,
  url: string,
  error: string
): ScrapeUserResult {
  return {
    success: false,
    userId,
    url,
    error,
    name: '',
    stats: { follows: 0, fans: 0, liked: 0, notes: 0 },
    scrapedAt: new Date().toISOString(),
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse count from text (supports Chinese format)
 *
 * Examples:
 * - "1.2万" -> 12000
 * - "500" -> 500
 * - "1.5w" -> 15000
 */
export function parseCount(text: string | null | undefined): number {
  if (!text) {
    return 0;
  }
  const t = String(text).trim();
  if (!t) {
    return 0;
  }

  // Handle Chinese format
  if (t.includes('万')) {
    return Math.floor(parseFloat(t) * 10000);
  }

  // Handle English format
  if (t.includes('w') || t.includes('W')) {
    return Math.floor(parseFloat(t) * 10000);
  }

  // Extract numbers
  return parseInt(t.replace(/[^0-9]/g, ''), 10) || 0;
}

/**
 * Get text content from selectors (tries multiple selectors)
 */
export function getTextFromSelectors(document: Document, selectors: string): string {
  for (const sel of selectors.split(', ')) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  return '';
}

/**
 * Get attribute from selectors (tries multiple selectors)
 */
export function getAttrFromSelectors(document: Document, selectors: string, attr: string): string {
  for (const sel of selectors.split(', ')) {
    const el = document.querySelector(sel);
    if (el?.getAttribute(attr)) {
      return el.getAttribute(attr) || '';
    }
  }
  return '';
}

/**
 * Get all matching elements' attribute
 */
export function getAllAttrFromSelectors(
  document: Document,
  selectors: string,
  attr: string
): string[] {
  const results: string[] = [];
  for (const sel of selectors.split(', ')) {
    const elements = document.querySelectorAll(sel);
    elements.forEach((el) => {
      const value = el.getAttribute(attr);
      if (value) {
        results.push(value);
      }
    });
    if (results.length > 0) {
      break;
    }
  }
  return results;
}
