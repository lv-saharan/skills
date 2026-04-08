/**
 * Interact Core - Shared logic for all interaction actions
 *
 * @module interact/core
 * @description Common utilities for like, collect, comment, follow actions
 */

import type { Page } from 'playwright';
import type { UserName } from '../../user';
import { preparePageForAction } from '../shared/page-prep';
import { extractNoteIdFromUrl } from '../shared/url-utils';
import { humanClick } from '../../core/anti-detect';
import { debugLog, gaussianDelay } from '../../core/utils';
import { INTERACTION_DELAYS } from '../shared/session';

// ============================================
// Types
// ============================================

/**
 * Result of page preparation for interact actions
 */
export interface InteractPrepResult {
  success: boolean;
  noteId?: string;
  error?: string;
}

/**
 * Result of status check via SVG use element
 */
export interface SvgStatusResult {
  visible: boolean;
  active: boolean;
}

/**
 * Configuration for SVG-based status detection
 */
export interface SvgStatusConfig {
  /** Selector for the wrapper element (e.g., '.like-wrapper') */
  wrapperSelector: string;
  /** Attribute value indicating active state (e.g., '#liked', '#collected') */
  activeAttrValue: string;
}

/**
 * Configuration for performInteractAction
 */
export interface InteractActionConfig {
  /** Action name for logging */
  actionName: string;
  /** Button selector to click */
  buttonSelector: string;
  /** SVG status configuration */
  svgStatus: SvgStatusConfig;
}

// ============================================
// Page Preparation
// ============================================

/**
 * Prepare page for interact action with auto-login support
 *
 * @param page - Playwright page
 * @param url - Target URL
 * @param user - User name for auto-login
 * @returns Preparation result with noteId
 */
export async function prepareInteractPage(
  page: Page,
  url: string,
  user: UserName
): Promise<InteractPrepResult> {
  // Extract noteId first
  const extraction = extractNoteIdFromUrl(url);
  if (!extraction.success) {
    return { success: false, error: extraction.error };
  }

  // Prepare page (navigate + check errors + auto-login if needed)
  const prep = await preparePageForAction(page, url, user);
  if (!prep.success) {
    return { success: false, error: prep.error };
  }

  return { success: true, noteId: extraction.noteId! };
}

// ============================================
// Status Detection
// ============================================

/**
 * Check interaction status via SVG use element
 *
 * Used by like, collect to detect current state.
 * The SVG use element's href attribute indicates the state:
 * - '#liked' = already liked
 * - '#like' = not liked yet
 *
 * @param page - Playwright page
 * @param config - SVG status configuration
 * @returns Status result
 */
export async function checkSvgStatus(
  page: Page,
  config: SvgStatusConfig
): Promise<SvgStatusResult> {
  try {
    const { wrapperSelector, activeAttrValue } = config;

    // Check if wrapper is visible
    const wrapper = page.locator(wrapperSelector).first();
    const isVisible = await wrapper.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isVisible) {
      return { visible: false, active: false };
    }

    // Get SVG use href attribute
    const href = await page.evaluate((selector) => {
      const useEl = document.querySelector(selector + ' svg use');
      if (!useEl) {
        return null;
      }
      return useEl.getAttribute('xlink:href') || useEl.getAttribute('href');
    }, wrapperSelector);

    if (!href) {
      return { visible: true, active: false };
    }

    debugLog('SVG use href: ' + href);
    return { visible: true, active: href === activeAttrValue };
  } catch {
    return { visible: false, active: false };
  }
}

// ============================================
// Core Interact Action
// ============================================

/**
 * Perform interaction action with unified flow
 *
 * @param page - Playwright page
 * @param url - Target URL
 * @param user - User name
 * @param config - Action configuration
 * @returns Result with status
 */
export async function performInteractAction(
  page: Page,
  url: string,
  user: UserName,
  config: InteractActionConfig
): Promise<{
  success: boolean;
  noteId: string;
  active: boolean;
  alreadyDone: boolean;
  error?: string;
}> {
  const { actionName, buttonSelector, svgStatus } = config;

  debugLog('Starting ' + actionName + '...');

  // Step 1: Prepare page (navigate + check errors + auto-login)
  const prep = await prepareInteractPage(page, url, user);
  if (!prep.success) {
    return {
      success: false,
      noteId: '',
      active: false,
      alreadyDone: false,
      error: prep.error,
    };
  }
  const noteId = prep.noteId!;

  // Step 2: Check current status
  const status = await checkSvgStatus(page, svgStatus);
  debugLog('Status: visible=' + status.visible + ', active=' + status.active);

  if (!status.visible) {
    return {
      success: false,
      noteId,
      active: false,
      alreadyDone: false,
      error: actionName + ' button not found',
    };
  }

  if (status.active) {
    debugLog('Already ' + actionName + ', skipping');
    return {
      success: true,
      noteId,
      active: true,
      alreadyDone: true,
    };
  }

  // Step 3: Click button
  debugLog('Clicking ' + actionName + ' button...');
  const clicked = await humanClick(page, buttonSelector, {
    delayBefore: 200,
    delayAfter: 300,
  });

  if (!clicked) {
    return {
      success: false,
      noteId,
      active: false,
      alreadyDone: false,
      error: 'Click failed',
    };
  }

  // Step 4: Wait for action to complete
  await gaussianDelay(INTERACTION_DELAYS.batchInterval);

  // Step 5: Verify result
  const finalStatus = await checkSvgStatus(page, svgStatus);
  debugLog('Final status: active=' + finalStatus.active);

  return {
    success: finalStatus.active,
    noteId,
    active: finalStatus.active,
    alreadyDone: false,
  };
}
