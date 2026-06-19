# Build script for Download Duster
# Creates distribution packages for Chrome and Firefox

param(
    [switch]$Chrome,
    [switch]$Firefox,
    [switch]$All
)

$distDir = "dist"

# Create dist directory
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

function Build-Chrome {
    Write-Host "Building Chrome extension..." -ForegroundColor Cyan

    $chromeDir = "$distDir\chrome"
    if (Test-Path $chromeDir) {
        Remove-Item -Recurse -Force $chromeDir
    }
    New-Item -ItemType Directory -Path $chromeDir | Out-Null

    # Copy files
    $files = @(
        "LICENSE",
        "manifest.json",
        "background.js",
        "popup.html",
        "popup.css",
        "popup.js",
        "privacy.md"
    )

    foreach ($file in $files) {
        Copy-Item $file $chromeDir
    }

    # Copy icons
    Copy-Item -Recurse "icons" "$chromeDir\icons"
    Remove-Item "$chromeDir\icons\*.ps1" -ErrorAction SilentlyContinue
    Remove-Item "$chromeDir\icons\*.html" -ErrorAction SilentlyContinue

    # Create zip
    $zipPath = "$distDir\download-duster-chrome.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath
    }
    Compress-Archive -Path "$chromeDir\*" -DestinationPath $zipPath

    Write-Host "Chrome build complete: $zipPath" -ForegroundColor Green
}

function Build-Firefox {
    Write-Host "Building Firefox extension..." -ForegroundColor Cyan

    $firefoxDir = "$distDir\firefox"
    if (Test-Path $firefoxDir) {
        Remove-Item -Recurse -Force $firefoxDir
    }
    New-Item -ItemType Directory -Path $firefoxDir | Out-Null

    # Copy files (Firefox uses the same manifest)
    $files = @(
        "LICENSE",
        "manifest.json",
        "background.js",
        "popup.html",
        "popup.css",
        "popup.js",
        "privacy.md"
    )

    foreach ($file in $files) {
        Copy-Item $file $firefoxDir
    }

    # Copy icons
    Copy-Item -Recurse "icons" "$firefoxDir\icons"
    Remove-Item "$firefoxDir\icons\*.ps1" -ErrorAction SilentlyContinue
    Remove-Item "$firefoxDir\icons\*.html" -ErrorAction SilentlyContinue

    # Create xpi
    $zipPath = "$distDir\download-duster-firefox.zip"
    $xpiPath = "$distDir\download-duster-firefox.xpi"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath
    }
    if (Test-Path $xpiPath) {
        Remove-Item $xpiPath
    }
    Compress-Archive -Path "$firefoxDir\*" -DestinationPath $zipPath
    Rename-Item -Path $zipPath -NewName "download-duster-firefox.xpi"

    Write-Host "Firefox build complete: $xpiPath" -ForegroundColor Green
}

# Determine what to build
if ($All -or (-not $Chrome -and -not $Firefox)) {
    Build-Chrome
    Build-Firefox
} else {
    if ($Chrome) { Build-Chrome }
    if ($Firefox) { Build-Firefox }
}

Write-Host ""
Write-Host "Build complete! Check the '$distDir' folder." -ForegroundColor Yellow
