# Troubleshooting Guide

This guide helps you resolve common issues when using Nestkick.

## 🔍 Quick Diagnostics

Before diving into specific issues, run the platform test to check your environment:

```bash
nestkick test-platform --report
```

This will identify potential problems with:

- Node.js and package manager versions
- Docker availability and permissions
- Port conflicts
- File system permissions
- Database client availability

## 🚀 Installation Issues

### Command Not Found

**Symptoms:** `nestkick: command not found`

**Solutions:**

**macOS/Linux:**

```bash
# Reload shell configuration
source ~/.zshrc    # for Zsh
source ~/.bashrc   # for Bash

# Or restart your terminal
```

**Windows:**

```powershell
# Refresh environment variables
refreshenv         # if using Chocolatey
# Or restart your terminal
```

**Manual PATH check:**

```bash
# Check if nestkick is in PATH
which nestkick     # macOS/Linux
where nestkick     # Windows
```

### Permission Denied

**Symptoms:** `Permission denied` when running nestkick

**Solutions:**

**macOS/Linux:**

```bash
sudo chmod +x /usr/local/bin/nestkick
```

**Windows:**

- Run PowerShell as Administrator
- Check Windows Defender settings

## 🐳 Docker Issues

### Docker Not Available

**Symptoms:** `Docker not available or not accessible`

**Solutions:**

1. **Install Docker:**

   ```bash
   # macOS
   brew install --cask docker

   # Ubuntu
   sudo apt-get install docker.io

   # Windows
   # Download from https://www.docker.com/products/docker-desktop
   ```

2. **Start Docker service:**

   ```bash
   # macOS/Linux
   sudo systemctl start docker

   # macOS (Docker Desktop)
   open /Applications/Docker.app
   ```

3. **Add user to docker group:**
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

### Port Conflicts

**Symptoms:** `Port 5432 is in use` or similar

**Solutions:**

1. **Check what's using the port:**

   ```bash
   # macOS/Linux
   lsof -i :5432

   # Windows
   netstat -ano | findstr :5432
   ```

2. **Stop conflicting services:**

   ```bash
   # PostgreSQL (macOS)
   brew services stop postgresql

   # PostgreSQL (Linux)
   sudo systemctl stop postgresql

   # PostgreSQL (Windows)
   net stop postgresql
   ```

3. **Use different ports:**
   ```bash
   nestkick create my-api --db-port 5433
   ```

### Container Build Failures

**Symptoms:** `Cannot find module '/app/dist/main'`

**Solutions:**

1. **Rebuild the container:**

   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

2. **Check Node.js version compatibility:**
   - Ensure your project uses Node.js 18+ in Dockerfile
   - Update Dockerfile if needed

## 📦 Package Manager Issues

### pnpm Build Failures

**Symptoms:** Build step fails with pnpm

**Solutions:**

1. **Use npm instead:**

   ```bash
   nestkick create my-api --pm npm
   ```

2. **Manual build:**

   ```bash
   cd my-api
   npx tsc
   ```

3. **Check pnpm configuration:**
   ```bash
   pnpm config get store-dir
   pnpm config get global-bin-dir
   ```

### Dependency Installation Failures

**Symptoms:** `Failed to install dependencies`

**Solutions:**

1. **Clear cache:**

   ```bash
   npm cache clean --force
   yarn cache clean
   pnpm store prune
   ```

2. **Check network:**

   ```bash
   # Test npm registry
   npm ping

   # Test yarn registry
   yarn config get registry
   ```

3. **Use different registry:**
   ```bash
   npm config set registry https://registry.npmjs.org/
   ```

## 🗄️ Database Issues

### Prisma Client Not Generated

**Symptoms:** `Cannot find module '@prisma/client'`

**Solutions:**

1. **Generate Prisma client:**

   ```bash
   cd my-api
   npx prisma generate
   ```

2. **Check Prisma schema:**

   ```bash
   npx prisma validate
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   npx prisma generate
   ```

### Database Connection Issues

**Symptoms:** `Connection refused` or `ECONNREFUSED`

**Solutions:**

1. **Check Docker containers:**

   ```bash
   docker-compose ps
   docker-compose logs postgres
   ```

2. **Verify database is running:**

   ```bash
   # PostgreSQL
   docker exec -it my-api-postgres-1 psql -U postgres

   # MySQL
   docker exec -it my-api-mysql-1 mysql -u root -p
   ```

3. **Check environment variables:**
   ```bash
   cat .env
   ```

## 🔧 Build Issues

### TypeScript Compilation Errors

**Symptoms:** TypeScript compilation fails

**Solutions:**

1. **Check TypeScript version:**

   ```bash
   npx tsc --version
   ```

2. **Update TypeScript:**

   ```bash
   npm install typescript@latest
   ```

3. **Check tsconfig.json:**
   ```bash
   npx tsc --noEmit
   ```

### Missing Dependencies

**Symptoms:** `Cannot find module` errors

**Solutions:**

1. **Reinstall dependencies:**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check package.json:**
   - Ensure all required dependencies are listed
   - Check for version conflicts

3. **Clear cache and reinstall:**
   ```bash
   npm cache clean --force
   npm install
   ```

## 🚨 Runtime Issues

### Application Won't Start

**Symptoms:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**

1. **Kill existing process:**

   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9

   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Use different port:**
   ```bash
   PORT=3001 npm run start:dev
   ```

### Memory Issues

**Symptoms:** `JavaScript heap out of memory`

**Solutions:**

1. **Increase Node.js memory:**

   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run start:dev
   ```

2. **Check for memory leaks:**
   ```bash
   # Monitor memory usage
   node --inspect npm run start:dev
   ```

## 🔍 Debugging Tips

### Enable Verbose Logging

```bash
# Enable debug logging
DEBUG=* nestkick create my-api

# Enable Docker verbose output
docker-compose up --verbose
```

### Check System Resources

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top
```

### Validate Environment

```bash
# Run comprehensive platform test
nestkick test-platform --report

# Check Node.js environment
node --version
npm --version

# Check Docker environment
docker --version
docker-compose --version
```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the logs:**

   ```bash
   # Application logs
   npm run start:dev 2>&1 | tee app.log

   # Docker logs
   docker-compose logs > docker.log
   ```

2. **Create a minimal reproduction:**
   - Create a new project with minimal configuration
   - Document the exact steps to reproduce the issue

3. **Open an issue:**
   - Visit: https://github.com/ThaWolf/nestkick/issues
   - Include:
     - Platform and version information
     - Complete error messages
     - Steps to reproduce
     - Log files (if applicable)

## 🔄 Common Workarounds

### Skip Problematic Steps

If a specific step is failing, you can often work around it:

```bash
# Skip Docker setup
nestkick create my-api --no-docker

# Skip testing setup
nestkick create my-api --no-testing

# Use different package manager
nestkick create my-api --pm npm
```

### Manual Setup

If automatic setup fails, you can complete it manually:

```bash
cd my-api

# Install dependencies
npm install

# Generate Prisma client (if using Prisma)
npx prisma generate

# Build the project
npm run build

# Start the application
npm run start:dev
```

---

**Remember:** Most issues can be resolved by running `nestkick test-platform --report` first to identify the root cause.
