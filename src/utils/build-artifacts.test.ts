import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

const distTemplates = path.join(process.cwd(), 'dist', 'templates');

const requiredDirs = ['base', 'prisma', 'typeorm', 'sequelize'];

const requiredFiles = [
  path.join('base', 'package.json.ejs'),
  path.join('base', 'src', 'main.ts.ejs'),
  path.join('prisma', 'src', 'modules', 'prisma.module.ts.ejs'),
];

describe('Build Artifacts: dist/templates', () => {
  it('should include all required template directories', async () => {
    for (const dir of requiredDirs) {
      const dirPath = path.join(distTemplates, dir);
      const exists = await fs.pathExists(dirPath);
      expect(exists).toBe(true);
    }
  });

  it('should include key template files', async () => {
    for (const relFile of requiredFiles) {
      const filePath = path.join(distTemplates, relFile);
      const exists = await fs.pathExists(filePath);
      expect(exists).toBe(true);
    }
  });
});
