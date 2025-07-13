import chalk from 'chalk';
import type { TemplateData } from '../types/index.js';

export class BrandingManager {
  private static readonly ASCII_LOGO = `
  _   _           _   _    _      _    
 | \\ | | ___  ___| |_| | _(_) ___| | __
 |  \\| |/ _ \\/ __| __| |/ / |/ __| |/ /
 | |\\  |  __/\\__ \\ |_|   <| | (__|   < 
 |_| \\_|\\___||___/\\__|_|\\_\\_|\\___|_|\\_\\
                                       
`;

  static getLogo(): string {
    return chalk.blue(this.ASCII_LOGO);
  }

  static getWelcomeMessage(templateData: TemplateData): string {
    const logo = this.getLogo();
    const projectInfo = this.getProjectInfo(templateData);
    const nextSteps = this.getNextSteps(templateData);

    return `${logo}
🚀 Kickstart your NestJS projects with style

${projectInfo}

${nextSteps}

⚡ Powered by Nestkick - https://github.com/ThaWolf/nestkick
📖 Happy coding! 🎯
`;
  }

  static getAppWelcomeMessage(templateData: TemplateData): string {
    const logo = this.getLogo();
    const projectInfo = this.getProjectInfo(templateData);
    const appInfo = this.getAppInfo(templateData);

    return `${logo}
🎉 Welcome to your new NestJS application!
${projectInfo}
${appInfo}
⚡ Powered by Nestkick - https://github.com/ThaWolf/nestkick
📖 Happy coding! 🎯
`;
  }

  private static getProjectInfo(templateData: TemplateData): string {
    return (
      chalk.blue('📋 Project Configuration:') +
      `
${chalk.gray('   Project Name:')} ${chalk.white(templateData.projectName)}
${chalk.gray('   ORM:')} ${chalk.white(templateData.orm)}
${chalk.gray('   Database:')} ${chalk.white(templateData.database)}
${chalk.gray('   Package Manager:')} ${chalk.white(templateData.packageManager)}
${chalk.gray('   Docker:')} ${chalk.white(templateData.docker ? 'Yes' : 'No')}
${chalk.gray('   Testing:')} ${chalk.white(templateData.testing ? 'Yes' : 'No')}`
    );
  }

  private static getAppInfo(templateData: TemplateData): string {
    return (
      chalk.blue('📦 Project:') +
      ` ${chalk.white(templateData.projectName)}
🚀 Server running on: ${chalk.cyan('http://localhost:3000')}
🗄️  Database: ${chalk.white(templateData.database)} with ${chalk.white(templateData.orm.toUpperCase())}
🐳 Docker: ${chalk.white(templateData.docker ? 'Ready to use with docker-compose up' : 'Not configured')}`
    );
  }

  private static getNextSteps(templateData: TemplateData): string {
    const steps = [
      `cd ${templateData.projectName}`,
      `${templateData.packageManager} install`,
    ];

    if (templateData.docker) {
      steps.push('docker-compose up -d');
    }

    steps.push(`${templateData.packageManager} run start:dev`);

    return (
      chalk.blue('📁 Next steps:') +
      '\n' +
      steps.map(step => chalk.gray(`   ${step}`)).join('\n')
    );
  }

  static getSuccessMessage(): string {
    return chalk.green('\n🎉 Project generated successfully!');
  }

  static getErrorMessage(error: string): string {
    return chalk.red(`\n❌ Project generation failed: ${error}`);
  }

  static getWarningMessage(warning: string): string {
    return chalk.yellow(`\n⚠️  Warning: ${warning}`);
  }
}
