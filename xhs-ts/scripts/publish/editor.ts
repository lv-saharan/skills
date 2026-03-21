/**
 * Publish editor functions
 *
 * @module publish/editor
 * @description Content editing logic for publish functionality
 */

import type { Page } from 'playwright';
import { XhsError, XhsErrorCode } from '../shared';
import { debugLog, delay, randomDelay } from '../utils/helpers';
import { SELECTORS } from './constants';

// ============================================
// Title Functions
// ============================================

/**
 * Fill in the note title
 */
export async function fillTitle(page: Page, title: string): Promise<void> {
  debugLog(`Filling title: ${title}`);

  // Wait a moment for the editor to be fully loaded
  await delay(500);

  // Try multiple selectors for title input
  const selectors = [
    'textarea[placeholder*="标题"]',
    '[placeholder*="标题"]',
    'textarea', // Just find any textarea (there should be only one for title)
  ];

  let found = false;
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 2000 });

      if (isVisible) {
        debugLog(`Found title input with selector: ${selector}`);
        await element.click();
        await delay(100);
        await element.fill(title);
        found = true;
        debugLog(`Title filled successfully`);
        break;
      }
    } catch (e) {
      debugLog(`Selector ${selector} failed: ${e}`);
    }
  }

  if (!found) {
    // Try using evaluate as fallback
    debugLog('Trying evaluate fallback for title...');
    const filled = await page.evaluate((t) => {
      const textareas = document.querySelectorAll('textarea');
      for (const textarea of textareas) {
        const el = textarea as HTMLTextAreaElement;
        const placeholder = el.placeholder || '';
        if (placeholder.includes('标题')) {
          el.focus();
          el.value = t;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      // If no placeholder match, use the first textarea
      if (textareas.length > 0) {
        const el = textareas[0] as HTMLTextAreaElement;
        el.focus();
        el.value = t;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, title);

    if (!filled) {
      throw new XhsError('Title input not found', XhsErrorCode.NOT_FOUND);
    }
    debugLog('Title filled using evaluate fallback');
  }

  await randomDelay(300, 600);
}

// ============================================
// Content Functions
// ============================================

/**
 * Fill in the note content
 */
export async function fillContent(page: Page, content: string): Promise<void> {
  debugLog(`Filling content (${content.length} chars)`);

  // Try multiple selectors for content input
  const selectors = [
    'textarea[placeholder*="正文"]',
    'textarea[placeholder*="描述"]',
    '[contenteditable="true"]',
    SELECTORS.contentInput,
  ];

  let found = false;
  for (const selector of selectors) {
    const element = page.locator(selector);
    const isVisible = await element.isVisible().catch(() => false);

    if (isVisible) {
      await element.click();
      await delay(100);

      // Check if it's a contenteditable element
      const isEditable = await element.getAttribute('contenteditable').catch(() => null);

      if (isEditable === 'true') {
        await element.fill(content);
      } else {
        await element.fill(content);
      }

      found = true;
      debugLog(`Content filled using selector: ${selector}`);
      break;
    }
  }

  if (!found) {
    // Try using evaluate as fallback
    const filled = await page.evaluate((c) => {
      const textareas = document.querySelectorAll('textarea');
      for (const textarea of textareas) {
        const el = textarea as HTMLTextAreaElement;
        if (
          el.placeholder?.includes('正文') ||
          el.placeholder?.includes('描述') ||
          el.placeholder?.includes('输入')
        ) {
          el.value = c;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
      }
      // Try contenteditable
      const editables = document.querySelectorAll('[contenteditable="true"]');
      if (editables.length > 0) {
        (editables[0] as HTMLElement).innerText = c;
        editables[0].dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    }, content);

    if (!filled) {
      throw new XhsError('Content input not found', XhsErrorCode.NOT_FOUND);
    }
    debugLog('Content filled using evaluate fallback');
  }

  await randomDelay(500, 1000);
}

// ============================================
// Tag Functions
// ============================================

/**
 * Add tags/topics to the note
 */
export async function addTags(page: Page, tags: string[]): Promise<void> {
  if (!tags || tags.length === 0) {
    return;
  }

  debugLog(`Adding tags: ${tags.join(', ')}`);

  // First, click the "话题" button to open the topic panel
  const topicBtn = page.locator(SELECTORS.topicButton);
  const topicBtnVisible = await topicBtn.isVisible().catch(() => false);

  if (!topicBtnVisible) {
    debugLog('Topic button not found, skipping tags');
    return;
  }

  await topicBtn.click();
  await delay(500);

  // Find tag input in the popup
  const tagInputSelectors = [
    SELECTORS.tagInput,
    'input[placeholder*="话题"]',
    'input[placeholder*="搜索"]',
  ];

  let tagInput = null;
  for (const selector of tagInputSelectors) {
    const element = page.locator(selector);
    const isVisible = await element.isVisible().catch(() => false);

    if (isVisible) {
      tagInput = element;
      break;
    }
  }

  if (!tagInput) {
    debugLog('Tag input not found after opening topic panel, skipping tags');
    return;
  }

  // Add each tag
  for (const tag of tags) {
    await tagInput.click();
    await delay(100);

    // Type the tag
    await tagInput.fill(tag);
    await delay(300);

    // Press Enter to add tag
    await tagInput.press('Enter');
    await randomDelay(300, 600);
  }

  debugLog(`Added ${tags.length} tags`);

  // Close the topic panel by clicking elsewhere
  await page.keyboard.press('Escape').catch(() => {});
  await delay(300);
}
