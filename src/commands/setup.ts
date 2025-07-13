import { Command } from 'commander';
import chalk from 'chalk';
import { setupInteractive } from '../utils/setup.js';

export const setupCommand = new Command('setup')
  .description('Interactive setup for creating a new NestJS project')
  .argument('<project-name>', 'Name of the project to create')
  .action(async (projectName: string) => {
    try {
      console.log(chalk.blue(`🎯 Setting up project: ${projectName}`));
      await setupInteractive(projectName);
    } catch (error) {
      console.error(
        chalk.red('Setup failed:'),
        error instanceof Error ? error.message : 'Unknown error'
      );
      process.exit(1);
    }
  });
