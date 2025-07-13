import fs from 'fs-extra';
import path from 'path';
import ejs from 'ejs';
import chalk from 'chalk';
import type { TemplateData } from '../types/index.js';
import { errorHandler } from './error-handler.js';
import { progressIndicator, type ProgressStep } from './progress-indicator.js';
import { templateCache } from './template-cache.js';

export class TemplateManager {
  private readonly templateBasePath: string;

  constructor() {
    // Get the directory of the current module (template-manager.js)
    const currentModuleUrl = import.meta.url;
    const currentModulePath = new URL(currentModuleUrl).pathname;
    const currentModuleDir = path.dirname(currentModulePath);

    // Navigate to the package root and then to templates
    // From dist/utils/template-manager.js -> dist/templates/
    const packageRoot = path.resolve(currentModuleDir, '..');
    this.templateBasePath = path.join(packageRoot, 'templates');
  }

  async renderTemplate(
    templatePath: string,
    data: TemplateData
  ): Promise<string> {
    const fullPath = path.join(this.templateBasePath, templatePath);

    if (!(await fs.pathExists(fullPath))) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    // Check cache first
    const cachedContent = await templateCache.getCachedTemplate(
      templatePath,
      data
    );
    if (cachedContent) {
      return cachedContent;
    }

    // Render template
    const template = await fs.readFile(fullPath, 'utf-8');
    const renderedContent = ejs.render(template, data, {
      async: false,
      root: this.templateBasePath,
    });

    // Cache the result
    await templateCache.setCachedTemplate(templatePath, data, renderedContent);

    return renderedContent;
  }

  async copyTemplateFile(
    templatePath: string,
    targetPath: string,
    data: TemplateData
  ): Promise<void> {
    const content = await this.renderTemplate(templatePath, data);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, content);
  }

  async copyDirectory(
    sourceDir: string,
    targetDir: string,
    data: TemplateData
  ): Promise<void> {
    const sourcePath = path.join(this.templateBasePath, sourceDir);
    const targetPath = path.join(targetDir);

    if (!(await fs.pathExists(sourcePath))) {
      throw new Error(`Template directory not found: ${sourceDir}`);
    }

    await this.copyDirectoryRecursive(sourcePath, targetPath, data);
  }

  private async copyDirectoryRecursive(
    sourcePath: string,
    targetPath: string,
    data: TemplateData
  ): Promise<void> {
    const items = await fs.readdir(sourcePath);

    for (const item of items) {
      const sourceItemPath = path.join(sourcePath, item);
      const targetItemPath = path.join(targetPath, item);
      const stats = await fs.stat(sourceItemPath);

      // Skip unnecessary docker-compose files when copying base directory
      if (this.shouldSkipFile(item, sourcePath, data)) {
        continue;
      }

      if (stats.isDirectory()) {
        // Skip docker directory - we'll handle it separately
        if (item === 'docker' && sourcePath.includes('base')) {
          continue;
        }

        await fs.ensureDir(targetItemPath);
        await errorHandler.trackCreatedDir(targetItemPath);
        await this.copyDirectoryRecursive(sourceItemPath, targetItemPath, data);
      } else {
        // Handle template files
        if (item.endsWith('.ejs')) {
          const templateContent = await fs.readFile(sourceItemPath, 'utf-8');
          const renderedContent = ejs.render(templateContent, data, {
            async: false,
            root: this.templateBasePath,
          });

          const targetFilePath = targetItemPath.replace(/\.ejs$/, '');
          await fs.ensureDir(path.dirname(targetFilePath));
          await fs.writeFile(targetFilePath, renderedContent);
          await errorHandler.trackCreatedFile(targetFilePath);
        } else {
          // Copy non-template files as-is
          await fs.copy(sourceItemPath, targetItemPath);
          await errorHandler.trackCreatedFile(targetItemPath);
        }
      }
    }
  }

  private shouldSkipFile(
    filename: string,
    sourcePath: string,
    data: TemplateData
  ): boolean {
    // Skip database-specific docker-compose files that don't match the selected database
    if (sourcePath.includes('base') && filename.startsWith('docker-compose.')) {
      const databaseFiles = [
        'docker-compose.postgres.yml.ejs',
        'docker-compose.mysql.yml.ejs',
        'docker-compose.mongodb.yml.ejs',
        'docker-compose.sqlite.yml.ejs',
      ];

      const selectedDbFile = `docker-compose.${data.database}.yml.ejs`;

      // Skip if it's a database-specific file but not the selected one
      if (databaseFiles.includes(filename) && filename !== selectedDbFile) {
        return true;
      }
    }

    return false;
  }

  async mergePackageJson(
    basePackagePath: string,
    additionsPath: string,
    targetPath: string,
    data: TemplateData
  ): Promise<void> {
    const basePackage = await this.renderTemplate(basePackagePath, data);
    const additions = await this.renderTemplate(additionsPath, data);

    const basePackageJson = JSON.parse(basePackage);
    const additionsJson = JSON.parse(additions);

    // Merge dependencies
    if (additionsJson.dependencies) {
      basePackageJson.dependencies = {
        ...basePackageJson.dependencies,
        ...additionsJson.dependencies,
      };
    }

    // Merge devDependencies
    if (additionsJson.devDependencies) {
      basePackageJson.devDependencies = {
        ...basePackageJson.devDependencies,
        ...additionsJson.devDependencies,
      };
    }

    // Merge scripts
    if (additionsJson.scripts) {
      basePackageJson.scripts = {
        ...basePackageJson.scripts,
        ...additionsJson.scripts,
      };
    }

    await fs.writeJson(targetPath, basePackageJson, { spaces: 2 });
  }

  async generateProjectStructure(
    projectPath: string,
    data: TemplateData
  ): Promise<void> {
    try {
      // Set up rollback point
      await errorHandler.addRollbackPoint(projectPath);

      const steps: ProgressStep[] = [
        {
          name: 'Copying base template',
          action: async () => {
            await this.copyDirectory('base', projectPath, data);
          },
          successMessage: 'Base template copied successfully',
        },
        {
          name: 'Copying ORM-specific templates',
          action: async () => {
            const ormTemplateDir = data.orm;
            if (
              await fs.pathExists(
                path.join(this.templateBasePath, ormTemplateDir)
              )
            ) {
              await this.copyDirectory(ormTemplateDir, projectPath, data);
            }
          },
          successMessage: `${data.orm} templates copied successfully`,
        },
        {
          name: 'Merging package.json',
          action: async () => {
            const additionsPath = path.join(
              data.orm,
              'package-additions.json.ejs'
            );
            if (
              await fs.pathExists(
                path.join(this.templateBasePath, additionsPath)
              )
            ) {
              await this.mergePackageJson(
                'base/package.json.ejs',
                additionsPath,
                path.join(projectPath, 'package.json'),
                data
              );
            }
          },
          successMessage: 'Package.json merged successfully',
        },
      ];

      // Add Docker steps if enabled
      if (data.docker) {
        steps.push({
          name: 'Generating Docker configuration',
          action: async () => {
            await this.generateDockerComposeFiles(projectPath, data);
          },
          successMessage: 'Docker configuration generated successfully',
        });
      }

      // Add CI/CD and README steps
      steps.push(
        {
          name: 'Generating CI/CD templates',
          action: async () => {
            await this.generateCICDTemplates(projectPath, data);
          },
          successMessage: 'CI/CD templates generated successfully',
        },
        {
          name: 'Generating README',
          action: async () => {
            await this.generateREADME(projectPath, data);
          },
          successMessage: 'README generated successfully',
        }
      );

      await progressIndicator.runSteps(steps, 'Generating Project Structure');
    } catch (error) {
      await errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async generateDockerComposeFiles(
    projectPath: string,
    data: TemplateData
  ): Promise<void> {
    console.log(chalk.blue('🐳 Generating Docker Compose files...'));

    // Generate main docker-compose.yml based on database type
    const dockerComposeTemplate = `base/docker-compose.${data.database}.yml.ejs`;
    if (
      await fs.pathExists(
        path.join(this.templateBasePath, dockerComposeTemplate)
      )
    ) {
      await this.copyTemplateFile(
        dockerComposeTemplate,
        path.join(projectPath, 'docker-compose.yml'),
        data
      );
    } else {
      // Fallback to base template
      await this.copyTemplateFile(
        'base/docker-compose.yml.ejs',
        path.join(projectPath, 'docker-compose.yml'),
        data
      );
    }

    // Generate production docker-compose file
    await this.copyTemplateFile(
      'base/docker-compose.prod.yml.ejs',
      path.join(projectPath, 'docker-compose.prod.yml'),
      data
    );

    // Only generate multi-database file for development/testing purposes
    await this.copyTemplateFile(
      'base/docker-compose.multi.yml.ejs',
      path.join(projectPath, 'docker-compose.multi.yml'),
      data
    );

    // Copy only the relevant database initialization scripts
    await this.copyDatabaseSpecificDockerFiles(projectPath, data);

    // Create .env.example file for Docker environment variables
    await this.generateDockerEnvExample(projectPath, data);

    console.log(chalk.green('✅ Docker Compose files generated'));
  }

  private async copyDatabaseSpecificDockerFiles(
    projectPath: string,
    data: TemplateData
  ): Promise<void> {
    const dockerDir = path.join(projectPath, 'docker');
    const databaseDockerDir = path.join(dockerDir, data.database);

    // Create docker directory structure
    await fs.ensureDir(databaseDockerDir);

    // Copy database-specific initialization files
    const sourceDbDir = path.join(
      this.templateBasePath,
      'base',
      'docker',
      data.database
    );
    if (await fs.pathExists(sourceDbDir)) {
      await this.copyDirectoryRecursive(sourceDbDir, databaseDockerDir, data);
    }
  }

  async generateDockerEnvExample(
    projectPath: string,
    data: TemplateData
  ): Promise<void> {
    console.log(chalk.blue('📝 Generating .env.example file...'));

    const dbPort = this.getDatabasePort(data.database);
    const dbUsername = this.getDatabaseUsername(data.database);
    const dbPassword = this.getDatabasePassword(data.database);

    const envExample = `# Docker Environment Variables
# Copy this file to .env and update the values

# Application
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=${this.getDatabaseUrl(data)}
${
  data.database !== 'sqlite'
    ? `DB_HOST=database
DB_PORT=${dbPort}
DB_USERNAME=${dbUsername}
DB_PASSWORD=${dbPassword}
DB_DATABASE=${data.projectName}`
    : `DB_PATH=./data/database.sqlite`
}

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Redis (optional)
REDIS_URL=redis://redis:6379

# Logging
LOG_LEVEL=info
`;

    const envPath = path.join(projectPath, '.env.example');
    await fs.writeFile(envPath, envExample);
    console.log(chalk.green('✅ .env.example file generated'));
  }

  async generateCICDTemplates(
    projectPath: string,
    data: TemplateData
  ): Promise<void> {
    console.log(chalk.blue('🚀 Generating CI/CD templates...'));

    // Create .github directory structure
    const githubPath = path.join(projectPath, '.github');
    await fs.ensureDir(githubPath);
    await fs.ensureDir(path.join(githubPath, 'workflows'));
    await fs.ensureDir(path.join(githubPath, 'ISSUE_TEMPLATE'));

    // Generate CI/CD workflow files
    await this.copyTemplateFile(
      'base/.github/workflows/ci.yml.ejs',
      path.join(githubPath, 'workflows', 'ci.yml'),
      data
    );

    await this.copyTemplateFile(
      'base/.github/workflows/dependency-review.yml.ejs',
      path.join(githubPath, 'workflows', 'dependency-review.yml'),
      data
    );

    // Generate issue templates
    await this.copyTemplateFile(
      'base/.github/ISSUE_TEMPLATE/bug_report.md.ejs',
      path.join(githubPath, 'ISSUE_TEMPLATE', 'bug_report.md'),
      data
    );

    await this.copyTemplateFile(
      'base/.github/ISSUE_TEMPLATE/feature_request.md.ejs',
      path.join(githubPath, 'ISSUE_TEMPLATE', 'feature_request.md'),
      data
    );

    // Generate pull request template
    await this.copyTemplateFile(
      'base/.github/pull_request_template.md.ejs',
      path.join(githubPath, 'pull_request_template.md'),
      data
    );

    console.log(chalk.green('✅ CI/CD templates generated'));
  }

  async generateREADME(projectPath: string, data: TemplateData): Promise<void> {
    console.log(chalk.blue('📖 Generating README...'));

    await this.copyTemplateFile(
      'base/README.md.ejs',
      path.join(projectPath, 'README.md'),
      data
    );

    // Generate troubleshooting guide
    await this.copyTemplateFile(
      'base/TROUBLESHOOTING.md.ejs',
      path.join(projectPath, 'TROUBLESHOOTING.md'),
      data
    );

    console.log(chalk.green('✅ README and documentation generated'));
  }

  private getDatabaseUrl(data: TemplateData): string {
    const { database, projectName } = data;

    switch (database) {
      case 'postgres':
        return `postgresql://postgres:password@database:5432/${projectName}`;
      case 'mysql':
        return `mysql://root:password@database:3306/${projectName}`;
      case 'sqlite':
        return `file:./data/database.sqlite`;
      case 'mongodb':
        return `mongodb://mongo:27017/${projectName}`;
      default:
        return `postgresql://postgres:password@database:5432/${projectName}`;
    }
  }

  private getDatabasePort(database: string): string {
    switch (database) {
      case 'postgres':
        return '5432';
      case 'mysql':
        return '3306';
      case 'mongodb':
        return '27017';
      case 'sqlite':
        return '';
      default:
        return '5432';
    }
  }

  private getDatabaseUsername(database: string): string {
    switch (database) {
      case 'postgres':
        return 'postgres';
      case 'mysql':
        return 'root';
      case 'mongodb':
        return '';
      case 'sqlite':
        return '';
      default:
        return 'postgres';
    }
  }

  private getDatabasePassword(database: string): string {
    switch (database) {
      case 'postgres':
        return 'password';
      case 'mysql':
        return 'password';
      case 'mongodb':
        return '';
      case 'sqlite':
        return '';
      default:
        return 'password';
    }
  }
}
