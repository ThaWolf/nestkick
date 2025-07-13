import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import type { TemplateData } from '../types/index.js';

export interface CachedTemplate {
  content: string;
  hash: string;
  timestamp: Date;
  templatePath: string;
  dataHash: string;
}

export class TemplateCache {
  private cacheDir: string;
  private cache: Map<string, CachedTemplate> = new Map();

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.nestkick-cache');
    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    await fs.ensureDir(this.cacheDir);
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private generateDataHash(data: TemplateData): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private getCacheKey(templatePath: string, data: TemplateData): string {
    const dataHash = this.generateDataHash(data);
    // Replace problematic characters for file systems
    const safeTemplatePath = templatePath.replace(/[/\\:]/g, '_');
    return `${safeTemplatePath}_${dataHash}`;
  }

  async getCachedTemplate(
    templatePath: string,
    data: TemplateData
  ): Promise<string | null> {
    const cacheKey = this.getCacheKey(templatePath, data);

    // Check in-memory cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.content;
    }

    // Check file cache
    const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);
    if (await fs.pathExists(cacheFilePath)) {
      try {
        const cachedData = (await fs.readJson(cacheFilePath)) as CachedTemplate;

        // Verify template file hasn't changed
        const templateFilePath = path.join(
          process.cwd(),
          'templates',
          templatePath
        );
        if (await fs.pathExists(templateFilePath)) {
          const templateContent = await fs.readFile(templateFilePath, 'utf-8');
          const currentHash = this.generateHash(templateContent);

          if (cachedData.hash === currentHash) {
            // Cache is valid, add to memory cache
            this.cache.set(cacheKey, cachedData);
            return cachedData.content;
          }
        }
      } catch {
        // Cache file corrupted, remove it
        await fs.remove(cacheFilePath).catch(() => {});
      }
    }

    return null;
  }

  async setCachedTemplate(
    templatePath: string,
    data: TemplateData,
    content: string
  ): Promise<void> {
    const cacheKey = this.getCacheKey(templatePath, data);
    const templateFilePath = path.join(
      process.cwd(),
      'templates',
      templatePath
    );

    if (await fs.pathExists(templateFilePath)) {
      const templateContent = await fs.readFile(templateFilePath, 'utf-8');
      const hash = this.generateHash(templateContent);
      const dataHash = this.generateDataHash(data);

      const cachedTemplate: CachedTemplate = {
        content,
        hash,
        timestamp: new Date(),
        templatePath,
        dataHash,
      };

      // Store in memory cache
      this.cache.set(cacheKey, cachedTemplate);

      // Store in file cache
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeJson(cacheFilePath, cachedTemplate, { spaces: 2 });
    }
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    await fs.remove(this.cacheDir);
    await this.ensureCacheDir();
  }

  async getCacheStats(): Promise<{
    memoryCacheSize: number;
    fileCacheSize: number;
    totalSize: number;
  }> {
    const files = await fs.readdir(this.cacheDir);
    const fileCacheSize = files.length;
    const memoryCacheSize = this.cache.size;

    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }

    return {
      memoryCacheSize,
      fileCacheSize,
      totalSize,
    };
  }

  async cleanupOldCache(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const files = await fs.readdir(this.cacheDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
        }
      } catch {
        // File might have been deleted, continue
      }
    }
  }
}

export const templateCache = new TemplateCache();
