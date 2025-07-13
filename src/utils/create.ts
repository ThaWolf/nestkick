import chalk from 'chalk';
import type { UserInputs } from '../types/index.js';
import { generateProject } from './generator.js';
import { BrandingManager } from './branding.js';

export async function createProject(
  projectName: string,
  options: UserInputs
): Promise<void> {
  console.log(BrandingManager.getLogo());
  console.log(chalk.blue('⚡ Quick Create Mode\n'));

  // Convert options to UserInputs format
  const userInputs: UserInputs = {
    projectName,
    orm: options.orm || 'prisma',
    database: options.database || 'postgres',
    packageManager: options.packageManager || 'npm',
    docker: options.docker !== false, // Default to true unless explicitly set to false
    testing: options.testing !== false, // Default to true unless explicitly set to false
  };

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
