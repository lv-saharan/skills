/**
 * Search commands (search-video, search-user)
 *
 * @module cli/commands/search.command
 */

import type { Command } from 'commander';
import type { CliSearchVideoOptions, CliSearchUserOptions } from '../types';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { executeSearchVideo, executeSearchUser } from '../../actions/search';
import { outputError } from '../../core/utils/output';
import { DouyinErrorCode } from '../../core/error';
import { debugLog } from '../../core/utils';

/**
 * Register search commands
 */
export function registerSearchCommands(program: Command): void {
  // Search Video Command
  program
    .command('search-video <keyword>')
    .description('搜索视频（支持筛选参数）')
    .option('--headless', '无头模式')
    .option('--user <name>', '用户名')
    .option('--sort-type <type>', '排序: comprehensive=综合, most-likes=最多点赞, latest=最新发布', 'comprehensive')
    .option('--publish-time <time>', '发布时间: unlimited=不限, one-day=一天内, one-week=一周内, six-months=半年内', 'unlimited')
    .option('--limit <n>', '最大结果数量', '10')
    .action(async (keyword: string, options: CliSearchVideoOptions) => {
      const headless = options.headless !== undefined ? options.headless : config.headless;
      const user = resolveUser(options.user);
      const sortType = options.sortType || 'comprehensive';
      const publishTime = options.publishTime || 'unlimited';
      const limit = options.limit ? parseInt(options.limit, 10) : 10;

      const validSortTypes = ['comprehensive', 'most-likes', 'latest'];
      if (!validSortTypes.includes(sortType || '')) {
        outputError('排序方式必须是: ' + validSortTypes.join(', '), DouyinErrorCode.NOT_FOUND);
        process.exit(1);
      }
      const validPublishTimes = ['unlimited', 'one-day', 'one-week', 'six-months'];
      if (!validPublishTimes.includes(publishTime || '')) {
        outputError('发布时间必须是: ' + validPublishTimes.join(', '), DouyinErrorCode.NOT_FOUND);
        process.exit(1);
      }

      debugLog('SearchVideo: keyword=' + keyword + ', sortType=' + sortType + ', publishTime=' + publishTime + ', limit=' + limit);
      await executeSearchVideo({ keyword, sortType: sortType as any, publishTime: publishTime as any, limit, headless, user });
    });

  // Search User Command
  program
    .command('search-user <keyword>')
    .description('搜索用户（支持筛选参数）')
    .option('--headless', '无头模式')
    .option('--user <name>', '用户名')
    .option('--user-type <type>', '用户类型: all=不限, common=普通用户, enterprise=企业用户, verified=个人认证用户', 'all')
    .option('--followers <range>', '粉丝数: all=不限, under-1k=1k以下, 1k-10k=1k-1万, 10k-100k=1万-10万, 100k-1m=10万-100万, over-1m=100万以上', 'all')
    .option('--limit <n>', '最大结果数量', '10')
    .action(async (keyword: string, options: CliSearchUserOptions) => {
      const headless = options.headless !== undefined ? options.headless : config.headless;
      const user = resolveUser(options.user);
      const userType = options.userType || 'all';
      const followers = options.followers || 'all';
      const limit = options.limit ? parseInt(options.limit, 10) : 10;

      const validUserTypes = ['all', 'common', 'enterprise', 'verified'];
      if (!validUserTypes.includes(userType || '')) {
        outputError('用户类型必须是: ' + validUserTypes.join(', '), DouyinErrorCode.NOT_FOUND);
        process.exit(1);
      }
      const validFollowers = ['all', 'under-1k', '1k-10k', '10k-100k', '100k-1m', 'over-1m'];
      if (!validFollowers.includes(followers || '')) {
        outputError('粉丝数必须是: ' + validFollowers.join(', '), DouyinErrorCode.NOT_FOUND);
        process.exit(1);
      }

      debugLog('SearchUser: keyword=' + keyword + ', userType=' + userType + ', followers=' + followers + ', limit=' + limit);
      await executeSearchUser({ keyword, limit, headless, user });
    });
}