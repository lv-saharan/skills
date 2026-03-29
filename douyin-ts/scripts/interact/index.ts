/**
 * Interact module
 *
 * @module interact
 * @description Interaction functionality (like, collect, search, follow) for Douyin
 */

// ============================================
// Like
// ============================================

export { executeLike, extractNoteId } from './like';
export type { LikeOptions, LikeResult, LikeManyResult } from './types';

// ============================================
// Collect
// ============================================

export { executeCollect } from './collect';
export type { CollectOptions, CollectResult, CollectManyResult } from './types';

// ============================================
// Follow
// ============================================

export { executeFollow } from './follow';
export type { FollowOptions, FollowResult, FollowManyResult } from './types';

// ============================================
// Search Video
// ============================================

export { executeSearchVideo, VideoSortType, PublishTimeType } from './search-video';
export type { VideoSearchOptions, VideoSortTypeValue, PublishTimeTypeValue } from './types';

// ============================================
// Search User
// ============================================

export { executeSearchUser } from './search-user';
export type { UserSearchOptions } from './types';

// ============================================
// Shared Types
// ============================================

export type { NoteIdExtraction, UserIdExtraction, SearchType, SearchResult, VideoSearchResult, UserSearchResult, SearchOperationResult } from './types';

// ============================================
// Shared Utilities
// ============================================

export { withAuthenticatedAction, INTERACTION_DELAYS } from './shared';
export { extractNoteId as extractNoteIdUtil } from './url-utils';

// ============================================
// Selectors
// ============================================

export {
  NOTE_SELECTORS,
  LIKE_SELECTORS,
  COLLECT_SELECTORS,
  FOLLOW_SELECTORS,
  SEARCH_SELECTORS,
  SEARCH_URLS,
} from './selectors';
