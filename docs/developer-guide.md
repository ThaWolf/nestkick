# Developer Guide

This guide helps developers contribute to Nestkick and understand the codebase architecture.

## 🏗️ Architecture Overview

Nestkick is built with a modular architecture designed for testability and maintainability:

```
src/
├── commands/           # CLI command definitions
├── utils/             # Core utilities and business logic
├── templates/         # Project template files
├── types/            # TypeScript type definitions
└── index.ts          # Main entry point
```

### Key Design Principles

1. **Dependency Injection**: All system dependencies are injected for testability
2. **Separation of Concerns**: Clear boundaries between CLI, business logic, and templates
3. **Error Handling**: Comprehensive error handling with actionable messages
4. **Cross-Platform Support**: Works on macOS, Linux, and Windows
5. **Type Safety**: Full TypeScript coverage with strict typing

## 🚀 Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/ThaWolf/nestkick.git
cd nestkick

# Install dependencies
pnpm install

# Start development mode
pnpm run dev

# Build the project
pnpm run build

# Run tests
pnpm test
```

### Development Commands

```bash
# Development
pnpm run dev          # Start development server with hot reload
pnpm run build        # Build the project
pnpm run start        # Run the built version

# Testing
pnpm test             # Run all tests
pnpm run test:coverage # Run tests with coverage
pnpm run test:watch   # Run tests in watch mode

# Code Quality
pnpm run lint         # Run ESLint
pnpm run lint:fix     # Fix ESLint issues
pnpm run format       # Format code with Prettier
pnpm run type-check   # Run TypeScript type checking

# Docker Testing
pnpm run test:docker  # Test Docker builds
pnpm run test:templates # Validate templates
```

## 🧪 Testing Strategy

### Test Structure

Tests are organized to mirror the source code structure:

```
src/
├── utils/
│   ├── port-scanner.ts
│   ├── port-scanner.test.ts    # Unit tests
│   ├── validation.ts
│   ├── validation.test.ts      # Unit tests
│   └── ...
└── commands/
    ├── create.ts
    └── create.test.ts          # Integration tests
```

### Testing Patterns

#### 1. Dependency Injection Testing

All utilities use dependency injection for testability:

```typescript
// Production code
export class PortScanner {
  constructor({ execAsync = promisify(exec), platform = os.platform() } = {}) {
    this.execAsync = execAsync;
    this.platform = platform;
  }
}

// Test code
const mockExec = vi.fn();
const scanner = new PortScanner({
  execAsync: mockExec,
  platform: 'darwin',
});
```

#### 2. Mocking System Calls

System calls are mocked to ensure reliable tests:

```typescript
// Mock child_process.exec
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  writeFile: vi.fn(),
  remove: vi.fn(),
}));
```

#### 3. Scenario-Based Testing

Tests cover specific scenarios and edge cases:

```typescript
describe('PortScanner', () => {
  it('should detect port conflicts on macOS', async () => {
    // Test macOS-specific behavior
  });

  it('should handle permission errors gracefully', async () => {
    // Test error handling
  });

  it('should work on Windows', async () => {
    // Test cross-platform compatibility
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test src/utils/port-scanner.test.ts

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch
```

## 🔧 Adding New Features

### 1. Adding a New Command

Create a new command file in `src/commands/`:

```typescript
import { Command } from 'commander';
import chalk from 'chalk';

export const newCommand = new Command('new-command')
  .description('Description of the new command')
  .option('-f, --flag', 'Optional flag')
  .action(async options => {
    try {
      // Command logic here
      console.log(chalk.green('Command executed successfully'));
    } catch (error) {
      console.error(chalk.red('Command failed:'), error.message);
      process.exit(1);
    }
  });
```

Register the command in `src/index.ts`:

```typescript
import { newCommand } from './commands/new-command.js';

program.addCommand(newCommand);
```

### 2. Adding a New Utility

Create a new utility file in `src/utils/`:

```typescript
export interface NewUtilityOptions {
  // Define options interface
}

export class NewUtility {
  constructor(options: NewUtilityOptions) {
    // Initialize with dependency injection
  }

  async doSomething(): Promise<void> {
    // Implementation
  }
}
```

### 3. Adding New Templates

Add template files in `templates/`:

```
templates/
├── base/              # Base templates
├── new-feature/       # New feature templates
│   ├── src/
│   ├── package.json.ejs
│   └── ...
└── ...
```

Update the template manager to include new templates:

```typescript
// In src/utils/template-manager.ts
private async copyNewFeatureTemplates(projectPath: string, templateData: TemplateData): Promise<void> {
  // Copy new feature templates
}
```

## 🐛 Debugging

### Debug Mode

Enable debug logging:

```bash
DEBUG=* pnpm run dev create my-api
```

### Verbose Output

Enable verbose output for specific operations:

```bash
# Verbose Docker output
docker-compose up --verbose

# Verbose npm output
npm install --verbose
```

### Logging

Add logging to your code:

```typescript
import chalk from 'chalk';

console.log(chalk.blue('Debug info:'), someVariable);
console.log(chalk.yellow('Warning:'), warningMessage);
console.log(chalk.red('Error:'), errorMessage);
```

## 📦 Building and Packaging

### Local Build

```bash
# Build the project
pnpm run build

# Test the built version
node dist/index.js --help
```

### Package for Distribution

```bash
# Build for all platforms
pnpm run package:all

# Build for specific platform
pnpm run package:linux
pnpm run package:macos
pnpm run package:windows
```

### Release Process

1. **Update version:**

   ```bash
   npm version patch  # or minor/major
   ```

2. **Build and test:**

   ```bash
   pnpm run release:prepare
   ```

3. **Create release:**

   ```bash
   pnpm run release:build
   ```

4. **Tag and push:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

## 🔍 Code Quality

### ESLint Configuration

ESLint is configured for TypeScript with strict rules:

```json
{
  "extends": ["@eslint/js", "@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### Prettier Configuration

Prettier ensures consistent code formatting:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80
}
```

### Git Hooks

Husky and lint-staged ensure code quality:

- **Pre-commit**: Format and lint staged files
- **Pre-push**: Run type checking and tests

## 🧪 Integration Testing

### Template Validation

Test that all templates are valid:

```bash
pnpm run test:templates
```

### Docker Build Testing

Test Docker builds for all configurations:

```bash
pnpm run test:docker
```

### End-to-End Testing

Create a test project and verify it works:

```bash
# Create test project
node dist/index.js create test-project --orm prisma --db postgres

# Verify it works
cd test-project
npm run start:dev
```

## 📚 Documentation

### Code Documentation

Use JSDoc for function documentation:

```typescript
/**
 * Checks if a port is available on the system
 * @param port - The port number to check
 * @returns Promise<boolean> - True if port is available
 */
async isPortAvailable(port: number): Promise<boolean> {
  // Implementation
}
```

### README Updates

When adding new features, update:

1. **README.md** - User-facing documentation
2. **docs/troubleshooting.md** - Troubleshooting guide
3. **docs/developer-guide.md** - This guide

### API Documentation

Document public APIs and interfaces:

```typescript
/**
 * Configuration options for project generation
 */
export interface UserInputs {
  /** Name of the project to create */
  projectName: string;
  /** ORM to use (prisma, typeorm, sequelize) */
  orm: 'prisma' | 'typeorm' | 'sequelize';
  // ... other options
}
```

## 🤝 Contributing Guidelines

### Pull Request Process

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make your changes:**
   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation

3. **Run quality checks:**

   ```bash
   pnpm run lint
   pnpm run format
   pnpm test
   pnpm run type-check
   ```

4. **Submit a pull request:**
   - Include a clear description
   - Reference any related issues
   - Ensure all CI checks pass

### Commit Message Format

Use conventional commit format:

```
type(scope): description

feat(commands): add new platform testing command
fix(docker): resolve Node.js version compatibility issue
docs(readme): update installation instructions
```

### Code Review

All changes require code review:

- Ensure code follows project standards
- Verify tests are comprehensive
- Check documentation is updated
- Confirm cross-platform compatibility

## 🚨 Common Issues

### Test Failures

**Mock not working:**

- Ensure mocks are defined before imports
- Check mock function signatures
- Verify mock return values

**Platform-specific tests:**

- Use `vi.mocked()` for proper typing
- Mock platform-specific behavior
- Test all supported platforms

### Build Issues

**TypeScript errors:**

- Run `pnpm run type-check`
- Check import/export statements
- Verify type definitions

**Template issues:**

- Validate EJS syntax
- Check template variables
- Test template rendering

### Performance Issues

**Slow builds:**

- Check template caching
- Optimize file operations
- Profile with `node --inspect`

**Memory leaks:**

- Monitor memory usage
- Check for unclosed resources
- Use heap snapshots for debugging

---

For more help, check the [troubleshooting guide](troubleshooting.md) or open an issue on GitHub.
