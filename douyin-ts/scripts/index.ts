#!/usr/bin/env node
/**
 * douyin-ts CLI Entry Point
 */

import { Command } from 'commander';
import type {
  CliLoginOptions, CliUserOptions, CliLikeOptions, CliCollectOptions,
  CliFollowOptions, CliSearchVideoOptions, CliSearchUserOptions,
} from './cli/types';
import { ensureMigrated, listUsers, setCurrentUser, resolveUser } from './user';
import { config, debugLog } from './utils/helpers';
import { outputSuccess, outputError } from './utils/output';
import { forceCleanup } from './browser';
import { DouyinErrorCode } from './shared';
import { executeLogin } from './login/execute';
import { executeLike } from './interact/like';
import { executeCollect } from './interact/collect';
import { executeFollow } from './interact/follow';
import { executeSearchVideo, VideoSortType, PublishTimeType } from './interact/search-video';
import { executeSearchUser, UserTypeFilter, FollowerFilter } from './interact/search-user';

await ensureMigrated();

const program = new Command();
program.name('douyin').description('抖音自动化 CLI 工具').version('0.0.2');

// User Command
program
  .command('user')
  .description('用户管理')
  .option('--set-current <name>', '设置当前用户')
  .action(async (options: CliUserOptions) => {
    try {
      if (options.setCurrent) {
        await setCurrentUser(options.setCurrent);
        outputSuccess({ current: options.setCurrent }, 'RELAY:已切换到用户 "' + options.setCurrent + '"');
        return;
      }
      const result = await listUsers();
      outputSuccess(result, 'PARSE:users');
    } catch (error) {
      debugLog('User command error:', error);
      if (error instanceof Error) outputError(error.message, DouyinErrorCode.BROWSER_ERROR);
      else outputError(String(error), DouyinErrorCode.BROWSER_ERROR);
    }
  });

// Login Command
program
  .command('login')
  .description('QR 码登录')
  .option('--headless', '无头模式')
  .option('--timeout <ms>', '超时时间')
  .option('--user <name>', '用户名')
  .action(async (options: CliLoginOptions) => {
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const timeout = options.timeout ? parseInt(options.timeout, 10) : config.loginTimeout;
    await executeLogin({ method: 'qr', headless, timeout, user });
  });

// Search Video Command (Semantic Filters)
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

// Search User Command (Semantic Filters)
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

// Like Command
program
  .command('like <urls...>')
  .description('点赞视频')
  .option('--headless', '无头模式')
  .option('--user <name>', '用户名')
  .option('--delay <ms>', '批量操作间隔')
  .action(async (urls: string[], options: CliLikeOptions) => {
    if (!urls || urls.length === 0) {
      outputError('请提供至少一个视频URL', DouyinErrorCode.NOT_FOUND);
      process.exit(1);
    }
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const delayBetweenLikes = options.delay ? parseInt(options.delay, 10) : 2000;
    await executeLike({ urls, headless, user, delayBetweenLikes });
  });

// Collect Command
program
  .command('collect <urls...>')
  .description('收藏视频')
  .option('--headless', '无头模式')
  .option('--user <name>', '用户名')
  .option('--delay <ms>', '批量操作间隔')
  .action(async (urls: string[], options: CliCollectOptions) => {
    if (!urls || urls.length === 0) {
      outputError('请提供至少一个视频URL', DouyinErrorCode.NOT_FOUND);
      process.exit(1);
    }
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const delayBetweenCollects = options.delay ? parseInt(options.delay, 10) : 2000;
    await executeCollect({ urls, headless, user, delayBetweenCollects });
  });

// Follow Command
program
  .command('follow <urls...>')
  .description('关注用户')
  .option('--headless', '无头模式')
  .option('--user <name>', '用户名')
  .option('--delay <ms>', '批量操作间隔')
  .action(async (urls: string[], options: CliFollowOptions) => {
    if (!urls || urls.length === 0) {
      outputError('请提供至少一个用户URL', DouyinErrorCode.NOT_FOUND);
      process.exit(1);
    }
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const delayBetweenFollows = options.delay ? parseInt(options.delay, 10) : 2000;
    await executeFollow({ urls, headless, user, delayBetweenFollows });
  });

// Error Handling
program.exitOverride();

process.on('uncaughtException', async (error) => {
  if (error instanceof Error && 'code' in error) {
    const commanderError = error as Error & { code: string; exitCode?: number };
    if (['commander.help', 'commander.version', 'commander.helpDisplayed'].includes(commanderError.code)) {
      process.exit(commanderError.exitCode ?? 0);
    }
  }
  debugLog('Uncaught exception:', error);
  outputError(error instanceof Error ? error.message : 'Unknown error', DouyinErrorCode.BROWSER_ERROR);
  await forceCleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  debugLog('Unhandled rejection:', reason);
  outputError(String(reason), DouyinErrorCode.BROWSER_ERROR);
  await forceCleanup();
  process.exit(1);
});

program.parse();