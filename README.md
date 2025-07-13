# Nestkick 🚀

[![GitHub release](https://img.shields.io/github/v/release/ThaWolf/nestkick)](https://github.com/ThaWolf/nestkick/releases)
[![GitHub stars](https://img.shields.io/github/stars/ThaWolf/nestkick)](https://github.com/ThaWolf/nestkick/stargazers)
[![GitHub license](https://img.shields.io/github/license/ThaWolf/nestkick)](https://github.com/ThaWolf/nestkick/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/ThaWolf/nestkick)](https://github.com/ThaWolf/nestkick/issues)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/ThaWolf/nestkick)](https://github.com/ThaWolf/nestkick/graphs/commit-activity)
[![GitHub workflow status](https://img.shields.io/github/actions/workflow/status/ThaWolf/nestkick/ci.yml)](https://github.com/ThaWolf/nestkick/actions)

> **Kickstart your NestJS projects with style** 🎯

Nestkick is a CLI tool that scaffolds production-ready NestJS applications with your preferred stack, from database to Docker.

## ✨ Features

- Interactive setup & quick commands
- Multiple ORMs: Prisma, TypeORM, Sequelize
- Database options: PostgreSQL, MySQL, SQLite, MongoDB
- Package manager support: npm, yarn, pnpm
- Docker-ready with docker-compose
- Beautiful UI & branding
- TypeScript & Zod validation
- Automatic post-generation steps
- Platform/environment testing
- Ready-to-run projects

## 🚀 Quick Start

**Install (macOS/Linux):**

```bash
curl -fsSL https://raw.githubusercontent.com/ThaWolf/nestkick/main/install.sh | bash
```

**Install (Windows):**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-Expression (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ThaWolf/nestkick/main/install.ps1").Content
```

**From source:**

```bash
git clone https://github.com/ThaWolf/nestkick.git
cd nestkick
pnpm install
pnpm run build
npm link
```

## Usage

**Interactive mode:**

```bash
nestkick setup my-app
```

**Quick mode:**

```bash
nestkick create my-app --orm prisma --db postgres --pm npm
```

**Platform test:**

```bash
nestkick test-platform
```

**Cache management:**

```bash
nestkick cache stats
```

## License

MIT © ThaWolf / Nestkick contributors

## Reporting Issues

If you find a bug, please use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) to file an issue.
