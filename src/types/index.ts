export type ORM = 'prisma' | 'typeorm' | 'sequelize';
export type Database = 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface ProjectOptions {
  orm: ORM;
  database: Database;
  packageManager: PackageManager;
  docker: boolean;
  testing: boolean;
}

export interface UserInputs {
  projectName: string;
  orm: ORM;
  database: Database;
  packageManager: PackageManager;
  docker: boolean;
  testing: boolean;
}

export interface TemplateData {
  projectName: string;
  orm: ORM;
  database: Database;
  packageManager: PackageManager;
  docker: boolean;
  testing: boolean;
}
