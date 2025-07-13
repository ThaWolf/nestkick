import inquirer from 'inquirer';
import chalk from 'chalk';
import type { UserInputs } from '../types/index.js';
import { validateProjectName } from './validation.js';
import { generateProject } from './generator.js';
import { BrandingManager } from './branding.js';

export async function setupInteractive(projectName: string): Promise<void> {
  console.log(BrandingManager.getLogo());
  console.log(chalk.blue('🎯 Interactive Setup Mode\n'));

  // Validate project name
  const validationResult = validateProjectName(projectName);
  if (!validationResult.isValid) {
    throw new Error(validationResult.error);
  }

  // Collect user inputs
  const answers = await inquirer.prompt<UserInputs>([
    {
      type: 'list',
      name: 'orm',
      message: 'Which ORM would you like to use?',
      choices: [
        { name: 'Prisma (Recommended)', value: 'prisma' },
        { name: 'TypeORM', value: 'typeorm' },
        { name: 'Sequelize', value: 'sequelize' },
      ],
      default: 'prisma',
    },
    {
      type: 'list',
      name: 'database',
      message: 'Which database would you like to use?',
      choices: [
        { name: 'PostgreSQL (Recommended)', value: 'postgres' },
        { name: 'MySQL', value: 'mysql' },
        { name: 'SQLite', value: 'sqlite' },
        { name: 'MongoDB', value: 'mongodb' },
      ],
      default: 'postgres',
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Which package manager would you like to use?',
      choices: [
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'pnpm (Recommended)', value: 'pnpm' },
      ],
      default: 'pnpm',
    },
    {
      type: 'confirm',
      name: 'docker',
      message: 'Would you like to include Docker setup?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'testing',
      message: 'Would you like to include testing setup?',
      default: true,
    },
  ]);

  // Combine project name with answers
  const userInputs: UserInputs = {
    ...answers,
    projectName,
  };

  console.log(chalk.green('\n✅ Configuration complete!'));
  console.log(chalk.blue('📋 Project Configuration:'));
  console.log(chalk.gray(`   Project Name: ${userInputs.projectName}`));
  console.log(chalk.gray(`   ORM: ${userInputs.orm}`));
  console.log(chalk.gray(`   Database: ${userInputs.database}`));
  console.log(chalk.gray(`   Package Manager: ${userInputs.packageManager}`));
  console.log(chalk.gray(`   Docker: ${userInputs.docker ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`   Testing: ${userInputs.testing ? 'Yes' : 'No'}`));

  // Generate the project
  await generateProject(userInputs);
}
