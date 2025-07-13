import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

export interface PortInfo {
  port: number;
  isOccupied: boolean;
  process?: string;
  service?: string;
}

export interface ServiceInfo {
  name: string;
  isRunning: boolean;
  port?: number;
  processId?: string;
  command?: string;
}

export class PortScanner {
  private readonly execAsync: (
    // eslint-disable-next-line no-unused-vars
    _cmd: string
  ) => Promise<{ stdout: string; stderr: string }>;
  private readonly platform: string;

  constructor({
    execAsync = promisify(exec),
    platform = os.platform(),
  }: {
    execAsync?: (
      // eslint-disable-next-line no-unused-vars
      _cmd: string
    ) => Promise<{ stdout: string; stderr: string }>;
    platform?: string;
  } = {}) {
    this.execAsync = execAsync;
    this.platform = platform;
  }

  async isPortAvailable(port: number): Promise<boolean> {
    try {
      const result = await this.checkPort(port);
      return !result.isOccupied;
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Could not check port ${port}: ${error}`)
      );
      return true;
    }
  }

  async checkPort(port: number): Promise<PortInfo> {
    try {
      if (this.platform === 'win32') {
        return await this.checkPortWindows(port);
      } else {
        return await this.checkPortUnix(port);
      }
    } catch (error) {
      throw new Error(`Failed to check port ${port}: ${error}`);
    }
  }

  async checkPorts(ports: number[]): Promise<PortInfo[]> {
    const results = await Promise.all(ports.map(port => this.checkPort(port)));
    return results;
  }

  async findAvailablePort(
    startPort: number,
    endPort: number = startPort + 100
  ): Promise<number> {
    for (let port = startPort; port <= endPort; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(
      `No available ports found in range ${startPort}-${endPort}`
    );
  }

  async detectDatabaseServices(): Promise<ServiceInfo[]> {
    const services: ServiceInfo[] = [];
    const postgresInfo = await this.detectPostgreSQL();
    if (postgresInfo) services.push(postgresInfo);
    const mysqlInfo = await this.detectMySQL();
    if (mysqlInfo) services.push(mysqlInfo);
    const mongodbInfo = await this.detectMongoDB();
    if (mongodbInfo) services.push(mongodbInfo);
    const redisInfo = await this.detectRedis();
    if (redisInfo) services.push(redisInfo);
    return services;
  }

  getCommonDatabasePorts(): number[] {
    return [5432, 3306, 27017, 6379, 3000];
  }

  async checkDatabasePortConflicts(): Promise<PortInfo[]> {
    const commonPorts = this.getCommonDatabasePorts();
    return await this.checkPorts(commonPorts);
  }

  getServiceManagementCommands(serviceName: string): string[] {
    const commands: string[] = [];
    if (this.platform === 'darwin') {
      commands.push(`brew services stop ${serviceName}`);
      commands.push(`brew services start ${serviceName}`);
      commands.push(`brew services restart ${serviceName}`);
    } else if (this.platform === 'linux') {
      commands.push(`sudo systemctl stop ${serviceName}`);
      commands.push(`sudo systemctl start ${serviceName}`);
      commands.push(`sudo systemctl restart ${serviceName}`);
    } else if (this.platform === 'win32') {
      commands.push(`net stop ${serviceName}`);
      commands.push(`net start ${serviceName}`);
    }
    return commands;
  }

  generatePortConflictMessage(portInfo: PortInfo): string {
    const { port, process, service } = portInfo;
    let message = chalk.red(`❌ Port ${port} is already in use`);
    if (service) {
      message += `\n   Service: ${chalk.yellow(service)}`;
    }
    if (process) {
      message += `\n   Process: ${chalk.yellow(process)}`;
    }
    message += `\n\n${chalk.blue('💡 Resolution options:')}`;
    if (this.platform === 'darwin') {
      message += `\n   1. Stop local service: ${chalk.cyan(`brew services stop ${service || 'postgresql'}`)}`;
      message += `\n   2. Use different port: ${chalk.cyan('nestkick create --db-port 5433')}`;
      message += `\n   3. Kill process: ${chalk.cyan(`lsof -ti:${port} | xargs kill -9`)}`;
    } else if (this.platform === 'linux') {
      message += `\n   1. Stop local service: ${chalk.cyan(`sudo systemctl stop ${service || 'postgresql'}`)}`;
      message += `\n   2. Use different port: ${chalk.cyan('nestkick create --db-port 5433')}`;
      message += `\n   3. Kill process: ${chalk.cyan(`sudo fuser -k ${port}/tcp`)}`;
    } else if (this.platform === 'win32') {
      message += `\n   1. Stop local service: ${chalk.cyan(`net stop ${service || 'postgresql'}`)}`;
      message += `\n   2. Use different port: ${chalk.cyan('nestkick create --db-port 5433')}`;
      message += `\n   3. Kill process: ${chalk.cyan(`netstat -ano | findstr :${port}`)}`;
    }
    return message;
  }

  private async checkPortUnix(port: number): Promise<PortInfo> {
    try {
      const { stdout } = await this.execAsync(`lsof -i :${port}`);
      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) {
        return { port, isOccupied: false };
      }
      const processLine = lines[1];
      if (!processLine) {
        return { port, isOccupied: false };
      }
      const parts = processLine.split(/\s+/);
      const processName = parts[0] || 'unknown';
      const processId = parts[1] || 'unknown';
      return {
        port,
        isOccupied: true,
        process: `${processName} (PID: ${processId})`,
        service: this.identifyService(processName, port),
      };
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 1) {
        return { port, isOccupied: false };
      }
      throw error;
    }
  }

  private async checkPortWindows(port: number): Promise<PortInfo> {
    try {
      const { stdout } = await this.execAsync(
        `netstat -ano | findstr :${port}`
      );
      const lines = stdout.trim().split('\n');
      if (lines.length === 0) {
        return { port, isOccupied: false };
      }
      const processLine = lines[0];
      if (!processLine) {
        return { port, isOccupied: false };
      }
      const parts = processLine.split(/\s+/);
      const processId = parts[parts.length - 1] || 'unknown';
      try {
        const { stdout: processName } = await this.execAsync(
          `tasklist /FI "PID eq ${processId}" /FO CSV /NH`
        );
        const processInfo =
          processName.split(',')[0]?.replace(/"/g, '') || 'unknown';
        return {
          port,
          isOccupied: true,
          process: `${processInfo} (PID: ${processId})`,
          service: this.identifyService(processInfo, port),
        };
      } catch {
        return {
          port,
          isOccupied: true,
          process: `Unknown process (PID: ${processId})`,
          service: this.identifyService('unknown', port),
        };
      }
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 1) {
        return { port, isOccupied: false };
      }
      throw error;
    }
  }

  private async detectPostgreSQL(): Promise<ServiceInfo | null> {
    try {
      if (this.platform === 'darwin') {
        const { stdout } = await this.execAsync(
          'brew services list | grep postgresql'
        );
        const isRunning = stdout.includes('started');
        return {
          name: 'postgresql',
          isRunning,
          port: 5432,
          command: isRunning
            ? 'brew services stop postgresql'
            : 'brew services start postgresql',
        };
      } else if (this.platform === 'linux') {
        const { stdout } = await this.execAsync(
          'systemctl is-active postgresql'
        );
        const isRunning = stdout.trim() === 'active';
        return {
          name: 'postgresql',
          isRunning,
          port: 5432,
          command: isRunning
            ? 'sudo systemctl stop postgresql'
            : 'sudo systemctl start postgresql',
        };
      }
    } catch {
      // Service not found or not running
    }
    return null;
  }

  private async detectMySQL(): Promise<ServiceInfo | null> {
    try {
      if (this.platform === 'darwin') {
        const { stdout } = await this.execAsync(
          'brew services list | grep mysql'
        );
        const isRunning = stdout.includes('started');
        return {
          name: 'mysql',
          isRunning,
          port: 3306,
          command: isRunning
            ? 'brew services stop mysql'
            : 'brew services start mysql',
        };
      } else if (this.platform === 'linux') {
        const { stdout } = await this.execAsync('systemctl is-active mysql');
        const isRunning = stdout.trim() === 'active';
        return {
          name: 'mysql',
          isRunning,
          port: 3306,
          command: isRunning
            ? 'sudo systemctl stop mysql'
            : 'sudo systemctl start mysql',
        };
      }
    } catch {
      // Service not found or not running
    }
    return null;
  }

  private async detectMongoDB(): Promise<ServiceInfo | null> {
    try {
      if (this.platform === 'darwin') {
        const { stdout } = await this.execAsync(
          'brew services list | grep mongodb'
        );
        const isRunning = stdout.includes('started');
        return {
          name: 'mongodb',
          isRunning,
          port: 27017,
          command: isRunning
            ? 'brew services stop mongodb'
            : 'brew services start mongodb',
        };
      } else if (this.platform === 'linux') {
        const { stdout } = await this.execAsync('systemctl is-active mongod');
        const isRunning = stdout.trim() === 'active';
        return {
          name: 'mongodb',
          isRunning,
          port: 27017,
          command: isRunning
            ? 'sudo systemctl stop mongod'
            : 'sudo systemctl start mongod',
        };
      }
    } catch {
      // Service not found or not running
    }
    return null;
  }

  private async detectRedis(): Promise<ServiceInfo | null> {
    try {
      if (this.platform === 'darwin') {
        const { stdout } = await this.execAsync(
          'brew services list | grep redis'
        );
        const isRunning = stdout.includes('started');
        return {
          name: 'redis',
          isRunning,
          port: 6379,
          command: isRunning
            ? 'brew services stop redis'
            : 'brew services start redis',
        };
      } else if (this.platform === 'linux') {
        const { stdout } = await this.execAsync('systemctl is-active redis');
        const isRunning = stdout.trim() === 'active';
        return {
          name: 'redis',
          isRunning,
          port: 6379,
          command: isRunning
            ? 'sudo systemctl stop redis'
            : 'sudo systemctl start redis',
        };
      }
    } catch {
      // Service not found or not running
    }
    return null;
  }

  public identifyService(processName: string, port: number): string {
    const processLower = processName.toLowerCase();
    if (processLower.includes('postgres') || port === 5432) {
      return 'postgresql';
    }
    if (processLower.includes('mysql') || port === 3306) {
      return 'mysql';
    }
    if (processLower.includes('mongo') || port === 27017) {
      return 'mongodb';
    }
    if (processLower.includes('redis') || port === 6379) {
      return 'redis';
    }
    if (port === 3000) {
      return 'application';
    }
    return 'unknown';
  }
}

// Export singleton instance
export const portScanner = new PortScanner();
