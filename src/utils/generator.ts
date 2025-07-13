import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import type { UserInputs, TemplateData } from '../types/index.js';
import {
  validateProjectName,
  validateORM,
  validateDatabase,
  validatePackageManager,
} from './validation.js';
import { TemplateManager } from './template-manager.js';
import { PostGenerationManager } from './post-generation.js';
import { BrandingManager } from './branding.js';

export async function generateProject(userInputs: UserInputs): Promise<void> {
  console.log(chalk.blue('\n🚀 Generating your NestJS project...\n'));

  // Validate all inputs
  const validations = [
    validateProjectName(userInputs.projectName),
    validateORM(userInputs.orm),
    validateDatabase(userInputs.database),
    validatePackageManager(userInputs.packageManager),
  ];

  for (const validation of validations) {
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
  }

  const projectPath = path.resolve(process.cwd(), userInputs.projectName);

  // Check if directory already exists
  if (await fs.pathExists(projectPath)) {
    throw new Error(`Directory '${userInputs.projectName}' already exists`);
  }

  try {
    // Create project directory
    await fs.ensureDir(projectPath);
    console.log(chalk.green('✅ Created project directory'));

    // Convert UserInputs to TemplateData
    const templateData: TemplateData = {
      projectName: userInputs.projectName,
      orm: userInputs.orm,
      database: userInputs.database,
      packageManager: userInputs.packageManager,
      docker: userInputs.docker,
      testing: userInputs.testing,
    };

    // Generate project structure using template manager
    const templateManager = new TemplateManager();
    await templateManager.generateProjectStructure(projectPath, templateData);

    // Generate Docker files if requested
    if (userInputs.docker) {
      await generateDockerFiles(projectPath, templateData);
      console.log(chalk.green('✅ Generated Docker configuration'));
    }

    // Generate testing setup if requested
    if (userInputs.testing) {
      await generateTestingSetup(projectPath);
      console.log(chalk.green('✅ Generated testing setup'));
    }

    // Run post-generation steps
    const postGenerationManager = new PostGenerationManager(
      projectPath,
      templateData
    );
    const postGenerationResult =
      await postGenerationManager.runPostGenerationSteps();

    // Display results
    if (postGenerationResult.success) {
      console.log(BrandingManager.getSuccessMessage());
      console.log(BrandingManager.getWelcomeMessage(templateData));
    } else {
      console.log(
        BrandingManager.getErrorMessage('Post-generation steps failed')
      );
      if (postGenerationResult.errors.length > 0) {
        console.log(chalk.red('Errors:'));
        postGenerationResult.errors.forEach(error => {
          console.log(chalk.red(`  - ${error}`));
        });
      }
      if (postGenerationResult.warnings.length > 0) {
        console.log(chalk.yellow('Warnings:'));
        postGenerationResult.warnings.forEach(warning => {
          console.log(chalk.yellow(`  - ${warning}`));
        });
      }
    }
  } catch (error) {
    // Cleanup on error
    if (await fs.pathExists(projectPath)) {
      await fs.remove(projectPath);
    }
    throw error;
  }
}

async function generateDockerFiles(
  projectPath: string,
  templateData: TemplateData
): Promise<void> {
  // Generate Dockerfile based on package manager
  let dockerfile = '';

  if (templateData.packageManager === 'npm') {
    dockerfile = `# Multi-stage build for ${templateData.projectName}
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate ORM clients if needed
${templateData.orm === 'prisma' ? 'RUN npm run db:generate' : ''}

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["npm", "run", "start:prod"]`;
  } else if (templateData.packageManager === 'yarn') {
    dockerfile = `# Multi-stage build for ${templateData.projectName}
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.loc[k] ./
RUN yarn install

# Copy source code
COPY . .

# Generate ORM clients if needed
${templateData.orm === 'prisma' ? 'RUN yarn db:generate' : ''}

# Build the application
RUN yarn build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
COPY yarn.loc[k] ./
RUN yarn install --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["yarn", "start:prod"]`;
  } else if (templateData.packageManager === 'pnpm') {
    dockerfile = `# Multi-stage build for ${templateData.projectName}
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yam[l] ./
RUN pnpm install

# Copy source code
COPY . .

# Generate ORM clients if needed
${templateData.orm === 'prisma' ? 'RUN pnpm db:generate' : ''}

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files and install only production dependencies
COPY package*.json ./
COPY pnpm-lock.yam[l] ./
RUN pnpm install --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["pnpm", "start:prod"]`;
  }

  await fs.writeFile(path.join(projectPath, 'Dockerfile'), dockerfile);
}

async function generateTestingSetup(projectPath: string): Promise<void> {
  // Placeholder for testing setup generation
  const testDir = path.join(projectPath, 'test');
  await fs.ensureDir(testDir);

  const jestConfig = `module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node'
};`;

  await fs.writeFile(path.join(projectPath, 'jest.config.js'), jestConfig);
}
