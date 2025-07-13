import { Command } from 'commander';
import chalk from 'chalk';
import { createProject } from '../utils/create.js';

export const createCommand = new Command('create')
  .description('Quick create a new NestJS project with specified options')
  .argument('<project-name>', 'Name of the project to create')
  .option(
    '-o, --orm <orm>',
    'ORM to use (prisma, typeorm, sequelize)',
    'prisma'
  )
  .option(
    '-d, --db <database>',
    'Database type (postgres, mysql, sqlite, mongodb)',
    'postgres'
  )
  .option(
    '-p, --pm <package-manager>',
    'Package manager (npm, yarn, pnpm)',
    'npm'
  )
  .option('--docker', 'Include Docker setup', true)
  .option('--no-docker', 'Skip Docker setup')
  .option('--testing', 'Include testing setup', true)
  .option('--no-testing', 'Skip testing setup')
  .action(async (projectName: string, options) => {
    try {
      console.log(chalk.blue(`⚡ Creating project: ${projectName}`));
      await createProject(projectName, options);
    } catch (error) {
      console.error(
        chalk.red('Creation failed:'),
        error instanceof Error ? error.message : 'Unknown error'
      );
      process.exit(1);
    }
  });
