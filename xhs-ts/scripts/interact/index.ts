/**
 * Interact module
 *
 * @module interact
 * @description Interaction functionality (like, collect, comment, follow) for Xiaohongshu
 */

// ============================================
// Like
// ============================================

// Main functions
export { executeLike, extractNoteId } from './like';

// Types
export type { LikeOptions, LikeResult, LikeManyResult, NoteIdExtraction } from './types';

// ============================================
// Selectors
// ============================================
// Exported for advanced usage and future interact features

export {
  NOTE_SELECTORS,
  LIKE_SELECTORS,
  COLLECT_SELECTORS,
  COMMENT_SELECTORS,
  FOLLOW_SELECTORS,
} from './selectors';
