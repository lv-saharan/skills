#!/usr/bin/env node
/**
 * xhs-ts CLI Entry Point
 *
 * @module index
 * @description Command-line interface for Xiaohongshu automation
 *
 * This file is now a thin entry point:
 * 1. Ensure migration
 * 2. Validate config
 * 3. Register commands
 * 4. Parse and execute
 */

import { Command } from 'commander';
import { ensureMigrated } from './user';
import { validateConfig } from './config';
import { registerAllCommands } from './cli';
import { debugLog } from './core/utils';
import { outputError } from './core/utils/output';
import { SkillErrorCode } from './config';

// ============================================
// Startup
// ============================================

await ensureMigrated();
validateConfig();

// ============================================
// CLI Setup
// ============================================

const program = new Command();
program.name('xhs').description('Xiaohongshu automation CLI').version('0.1.1');

// Register all commands (each in its own file under cli/commands/)
registerAllCommands(program);

// ============================================
// Error Handling
// ============================================

program.exitOverride();

process.on('uncaughtException', (error) => {
  if (error instanceof Error && 'code' in error) {
    const commanderError = error as Error & { code: string; exitCode?: number };
    const normalCodes = ['commander.help', 'commander.version', 'commander.helpDisplayed'];
    if (normalCodes.includes(commanderError.code)) {
      process.exit(commanderError.exitCode ?? 0);
    }
  }

  debugLog('Uncaught exception:', error);
  outputError(error.message || 'Unknown error', SkillErrorCode.BROWSER_ERROR);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  debugLog('Unhandled rejection:', reason);
  outputError(String(reason), SkillErrorCode.BROWSER_ERROR);
  process.exit(1);
});

// ============================================
// Run CLI
// ============================================

program.parse();
