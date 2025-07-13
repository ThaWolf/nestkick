# Nestkick Installation Script for Windows
# This script downloads and installs Nestkick CLI from GitHub releases

param(
    [switch]$Force
)

# Configuration
$Repo = "ThaWolf/nestkick"
$LatestReleaseUrl = "https://api.github.com/repos/$Repo/releases/latest"
$InstallDir = "$env:LOCALAPPDATA\Programs\nestkick"
$BinaryName = "nestkick.exe"

Write-Host "🚀 Installing Nestkick CLI..." -ForegroundColor Blue

# Create installation directory
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Get latest release
Write-Host "📥 Fetching latest release..." -ForegroundColor Blue
try {
    $Response = Invoke-RestMethod -Uri $LatestReleaseUrl
    $LatestTag = $Response.tag_name
    Write-Host "📦 Latest version: $LatestTag" -ForegroundColor Blue
} catch {
    Write-Host "❌ Failed to get latest release" -ForegroundColor Red
    exit 1
}

# Download URL
$DownloadUrl = "https://github.com/$Repo/releases/download/$LatestTag/$BinaryName"

# Download binary
Write-Host "⬇️  Downloading Nestkick..." -ForegroundColor Blue
$BinaryPath = Join-Path $InstallDir $BinaryName

try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $BinaryPath
    Write-Host "✅ Download completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed" -ForegroundColor Red
    exit 1
}

# Add to PATH if not already present
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($CurrentPath -notlike "*$InstallDir*") {
    Write-Host "🔧 Adding to PATH..." -ForegroundColor Blue
    $NewPath = "$CurrentPath;$InstallDir"
    [Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")
    Write-Host "✅ PATH updated" -ForegroundColor Green
    Write-Host "🔄 Please restart your terminal or refresh environment variables" -ForegroundColor Yellow
} else {
    Write-Host "✅ PATH is already configured correctly" -ForegroundColor Green
}

# Verify installation
if (Get-Command $BinaryName -ErrorAction SilentlyContinue) {
    Write-Host "✅ Nestkick installed successfully!" -ForegroundColor Green
    Write-Host "🎯 Try running: $BinaryName --help" -ForegroundColor Blue
} else {
    Write-Host "⚠️  Nestkick installed but not found in PATH" -ForegroundColor Yellow
    Write-Host "🔄 Please restart your terminal or refresh environment variables" -ForegroundColor Blue
    Write-Host "🎯 Then try: $BinaryName --help" -ForegroundColor Blue
}

Write-Host "🎉 Welcome to Nestkick!" -ForegroundColor Green
Write-Host "📖 Documentation: https://github.com/$Repo#readme" -ForegroundColor Blue
Write-Host "🐛 Issues: https://github.com/$Repo/issues" -ForegroundColor Blue 