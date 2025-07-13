#!/bin/bash

# Nestkick Installation Script
# This script downloads and installs Nestkick CLI from GitHub releases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="ThaWolf/nestkick"
LATEST_RELEASE_URL="https://api.github.com/repos/$REPO/releases/latest"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="nestkick"

echo -e "${BLUE}🚀 Installing Nestkick CLI...${NC}"

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
    x86_64) ARCH="x64" ;;
    aarch64) ARCH="arm64" ;;
    armv7l) ARCH="armv7" ;;
    *) echo -e "${RED}❌ Unsupported architecture: $ARCH${NC}" && exit 1 ;;
esac

# Determine binary name
case $OS in
    linux) BINARY_FILE="nestkick-linux-$ARCH" ;;
    darwin) BINARY_FILE="nestkick-macos-$ARCH" ;;
    msys*|cygwin*|mingw*) BINARY_FILE="nestkick-win-$ARCH.exe" ;;
    *) echo -e "${RED}❌ Unsupported OS: $OS${NC}" && exit 1 ;;
esac

echo -e "${BLUE}📋 Detected: $OS $ARCH${NC}"

# Get latest release
echo -e "${BLUE}📥 Fetching latest release...${NC}"
LATEST_TAG=$(curl -s $LATEST_RELEASE_URL | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_TAG" ]; then
    echo -e "${RED}❌ Failed to get latest release${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Latest version: $LATEST_TAG${NC}"

# Download URL
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/$BINARY_FILE"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Download binary
echo -e "${BLUE}⬇️  Downloading Nestkick...${NC}"
if curl -L -o $BINARY_FILE "$DOWNLOAD_URL"; then
    echo -e "${GREEN}✅ Download completed${NC}"
else
    echo -e "${RED}❌ Download failed${NC}"
    rm -rf $TEMP_DIR
    exit 1
fi

# Make binary executable
chmod +x $BINARY_FILE

# Check if install directory is writable
if [ ! -w "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠️  $INSTALL_DIR is not writable, trying with sudo...${NC}"
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

# Install binary
echo -e "${BLUE}📦 Installing to $INSTALL_DIR...${NC}"
$SUDO_CMD mv $BINARY_FILE "$INSTALL_DIR/$BINARY_NAME"

# Clean up
rm -rf $TEMP_DIR

# Check and update PATH if needed
update_path() {
    local shell_rc=""
    local path_added=false
    
    # Detect shell and RC file
    case "$SHELL" in
        */zsh)
            shell_rc="$HOME/.zshrc"
            ;;
        */bash)
            shell_rc="$HOME/.bashrc"
            if [ -f "$HOME/.bash_profile" ]; then
                shell_rc="$HOME/.bash_profile"
            fi
            ;;
        */fish)
            shell_rc="$HOME/.config/fish/config.fish"
            ;;
        *)
            shell_rc="$HOME/.profile"
            ;;
    esac
    
    # Check if INSTALL_DIR is in PATH
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        echo -e "${YELLOW}⚠️  $INSTALL_DIR is not in your PATH${NC}"
        echo -e "${BLUE}🔧 Adding to PATH...${NC}"
        
        # Create shell RC file if it doesn't exist
        if [ ! -f "$shell_rc" ]; then
            touch "$shell_rc"
        fi
        
        # Add PATH export if not already present
        if ! grep -q "export PATH.*$INSTALL_DIR" "$shell_rc"; then
            echo "" >> "$shell_rc"
            echo "# Nestkick CLI" >> "$shell_rc"
            echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$shell_rc"
            path_added=true
        fi
        
        if [ "$path_added" = true ]; then
            echo -e "${GREEN}✅ PATH updated in $shell_rc${NC}"
            echo -e "${YELLOW}🔄 Please restart your terminal or run: source $shell_rc${NC}"
        fi
    else
        echo -e "${GREEN}✅ PATH is already configured correctly${NC}"
    fi
}

# Update PATH
update_path

# Verify installation
if command -v $BINARY_NAME >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Nestkick installed successfully!${NC}"
    echo -e "${BLUE}🎯 Try running: $BINARY_NAME --help${NC}"
else
    echo -e "${YELLOW}⚠️  Nestkick installed but not found in PATH${NC}"
    echo -e "${BLUE}🔄 Please restart your terminal or run: source $shell_rc${NC}"
    echo -e "${BLUE}🎯 Then try: $BINARY_NAME --help${NC}"
fi

echo -e "${GREEN}🎉 Welcome to Nestkick!${NC}"
echo -e "${BLUE}📖 Documentation: https://github.com/$REPO#readme${NC}"
echo -e "${BLUE}🐛 Issues: https://github.com/$REPO/issues${NC}" 