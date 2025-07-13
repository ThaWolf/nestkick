# Contributing to Nestkick

Thank you for your interest in contributing to Nestkick! 🚀

## 🤝 How to Contribute

### Reporting Bugs

- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include steps to reproduce the issue
- Provide your environment details (OS, Node.js version, etc.)

### Suggesting Features

- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Describe the problem you're trying to solve
- Explain how the feature would help

### Submitting Code

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `npm run test`
5. **Run linter**: `npm run lint`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to your fork**: `git push origin feature/amazing-feature`
8. **Create a Pull Request**

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/username/nestkick.git
cd nestkick

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build the project
pnpm run build

# Run tests
pnpm run test

# Run linter
pnpm run lint

# Format code
pnpm run format
```

### Testing Your Changes

```bash
# Test the CLI locally
npm link
nestkick --help

# Test project generation
nestkick create test-project --orm prisma --db postgres

# Test interactive mode
nestkick setup test-interactive
```

## 📋 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing

- Write tests for new features
- Ensure all tests pass before submitting
- Aim for good test coverage
- Test both success and error cases

### Git Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Examples:

```
feat(cli): add cache management commands
fix(templates): resolve SQLite database configuration
docs(readme): update installation instructions
```

### Pull Request Guidelines

- Use descriptive PR titles
- Include a summary of changes
- Reference related issues
- Ensure CI checks pass
- Request reviews from maintainers

## 🏗️ Project Structure

```
src/
├── commands/          # CLI commands
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
└── index.ts          # Main entry point

templates/
├── base/             # Base templates
├── prisma/           # Prisma-specific templates
├── typeorm/          # TypeORM-specific templates
└── sequelize/        # Sequelize-specific templates
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- src/utils/validation.test.ts
```

### Writing Tests

- Use Vitest for testing
- Place test files next to source files with `.test.ts` extension
- Use descriptive test names
- Test both success and error scenarios

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { validateProjectName } from '../validation';

describe('validateProjectName', () => {
  it('should accept valid project names', () => {
    const result = validateProjectName('my-valid-project');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid project names', () => {
    const result = validateProjectName('invalid name with spaces');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('spaces');
  });
});
```

## 🐛 Debugging

### Common Issues

1. **Template not found**: Check if template file exists in `templates/` directory
2. **Build errors**: Run `npm run build` to check TypeScript compilation
3. **Test failures**: Check test output for specific error messages

### Debug Mode

```bash
# Run with debug logging
DEBUG=* npm run dev

# Run specific command with debug
DEBUG=* node dist/index.js create test-project
```

## 📚 Documentation

### Updating Documentation

- Update README.md for user-facing changes
- Update CONTRIBUTING.md for development process changes
- Add JSDoc comments for new functions
- Update help text for new CLI options

### Template Documentation

When adding new templates:

1. Update the template documentation
2. Add examples in README.md
3. Include troubleshooting tips
4. Test the template thoroughly

## 🚀 Release Process

### Version Management

- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update version in `package.json`
- Create a changelog entry
- Tag releases with version number

### Pre-release Checklist

- [ ] All tests pass
- [ ] Linter passes
- [ ] Documentation is updated
- [ ] Version is updated
- [ ] Changelog is updated
- [ ] Release notes are prepared

## 🤝 Community

### Getting Help

- Check existing issues and discussions
- Join our Discord community
- Ask questions in GitHub Discussions
- Review the troubleshooting guide

### Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the project's code of conduct

## 🙏 Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes
- Project documentation
- Community acknowledgments

Thank you for contributing to Nestkick! 🎉
