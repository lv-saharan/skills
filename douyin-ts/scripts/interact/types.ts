/**
 * Interact module types
 */

import type { UserName } from '../user';

export interface LikeOptions {
  urls: string[];
  headless?: boolean;
  user?: UserName;
  delayBetweenLikes?: number;
}

export interface LikeResult {
  success: boolean;
  url: string;
  noteId: string;
  liked: boolean;
  alreadyLiked?: boolean;
  error?: string;
  user?: UserName;
}

export interface LikeManyResult {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: LikeResult[];
  user?: UserName;
}

export interface NoteIdExtraction {
  success: boolean;
  noteId?: string;
  error?: string;
}

export interface CollectOptions {
  urls: string[];
  headless?: boolean;
  user?: UserName;
  delayBetweenCollects?: number;
}

export interface CollectResult {
  success: boolean;
  url: string;
  noteId: string;
  collected: boolean;
  alreadyCollected?: boolean;
  error?: string;
  user?: UserName;
}

export interface CollectManyResult {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: CollectResult[];
  user?: UserName;
}

export interface CommentOptions {
  url: string;
  text: string;
  headless?: boolean;
  user?: UserName;
}

export interface CommentResult {
  success: boolean;
  url: string;
  noteId: string;
  text: string;
  error?: string;
  user?: UserName;
}

export interface UserIdExtraction {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface FollowOptions {
  urls: string[];
  headless?: boolean;
  user?: UserName;
  delayBetweenFollows?: number;
}

export interface FollowResult {
  success: boolean;
  url: string;
  userId: string;
  following: boolean;
  alreadyFollowing?: boolean;
  error?: string;
  user?: UserName;
}

export interface FollowManyResult {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: FollowResult[];
  user?: UserName;
}

export type SearchType = 'general' | 'video' | 'user';

export interface SearchOptions {
  keyword: string;
  type?: SearchType;
  limit?: number;
  headless?: boolean;
  user?: UserName;
}

export interface VideoSearchResult {
  type: 'video';
  url: string;
  videoId: string;
  title: string;
  author: string;
  authorUrl?: string;
  likes?: string;
  duration?: string;
  timeAgo?: string;
  
  /** Is part of a collection */
  hasCollection?: boolean;
  comments?: number;
}

export interface UserSearchResult {
  type: 'user';
  url: string;
  userId: string;
  nickname: string;
  signature?: string;
  followers?: number;
  avatarUrl?: string;
  verified?: boolean;
}

export type SearchResult = VideoSearchResult | UserSearchResult;

export interface SearchOperationResult {
  success: boolean;
  keyword: string;
  type: SearchType;
  total: number;
  results: SearchResult[];
  user?: UserName;
  error?: string;
}

export type VideoSortTypeValue = 'comprehensive' | 'most-likes' | 'latest';
export type PublishTimeTypeValue = 'unlimited' | 'one-day' | 'one-week' | 'six-months';

export interface VideoSearchOptions {
  keyword: string;
  sortType?: VideoSortTypeValue;
  publishTime?: PublishTimeTypeValue;
  limit?: number;
  headless?: boolean;
  user?: UserName;
}

export type UserTypeFilterValue = 'all' | 'common' | 'enterprise' | 'verified';
export type FollowerFilterValue = 'all' | 'under-1k' | '1k-10k' | '10k-100k' | '100k-1m' | 'over-1m';

export interface UserSearchOptions {
  keyword: string;
  userType?: UserTypeFilterValue;
  followers?: FollowerFilterValue;
  limit?: number;
  headless?: boolean;
  user?: UserName;
}

export interface VideoSearchResultExtended extends VideoSearchResult {
  authorId?: string;
  durationSeconds?: number;
  likesCount?: number;
  shares?: number;
  createTime?: number;
}

export interface UserSearchResultExtended extends UserSearchResult {
  videoCount?: number;
  likeCount?: number;
  following?: number;
}
