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
export { executeLike } from './like';

// Types
export type { LikeOptions, LikeResult, LikeManyResult } from './types';

// ============================================
// Collect
// ============================================

// Main functions
export { executeCollect } from './collect';

// Types
export type { CollectOptions, CollectResult, CollectManyResult } from './types';

// ============================================
// Comment
// ============================================

// Main functions
export { executeComment } from './comment';

// Types
export type { CommentOptions, CommentResult } from './types';

// ============================================
// Follow
// ============================================

// Main functions
export { executeFollow } from './follow';

// Types
export type { FollowOptions, FollowResult, FollowManyResult, UserIdExtraction } from './types';

// ============================================
// Shared Types
// ============================================

export type { NoteIdExtraction } from './types';

// ============================================
