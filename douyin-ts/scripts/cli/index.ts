/**
 * CLI Command Registration
 *
 * @module cli/index
 * @description Registers all CLI commands with Commander program
 */

import type { Command } from 'commander';
import { registerUserCommand } from './commands/user.command';
import { registerLoginCommand } from './commands/login.command';
import { registerSearchCommands } from './commands/search.command';
import { registerInteractCommands } from './commands/interact.command';

/**
 * Register all CLI commands on a Commander program
 */
export function registerAllCommands(program: Command): void {
  registerUserCommand(program);
  registerLoginCommand(program);
  registerSearchCommands(program);
  registerInteractCommands(program);
}