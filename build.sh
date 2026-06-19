#!/bin/bash

# Build script for Download Duster for macOS and Linux
# Creates distribution packages for Chrome and Firefox

# Stop on errors
set -e

DIST_DIR="dist"

# Create dist directory
mkdir -p "$DIST_DIR"

build_chrome() {
    echo "Building Chrome extension..."
    CHROME_DIR="$DIST_DIR/chrome"
    rm -rf "$CHROME_DIR"
    mkdir -p "$CHROME_DIR"

    # Copy files
    cp LICENSE manifest.json background.js popup.html popup.css popup.js privacy.md "$CHROME_DIR"

    # Copy icons
    mkdir -p "$CHROME_DIR/icons"
    cp icons/icon16.png  "$CHROME_DIR/icons/icon16.png"
    cp icons/icon32.png  "$CHROME_DIR/icons/icon32.png"
    cp icons/icon48.png  "$CHROME_DIR/icons/icon48.png"
    cp icons/icon128.png "$CHROME_DIR/icons/icon128.png"

    # Copy assets
    cp -r assets "$CHROME_DIR/assets"

    # Create zip
    (cd "$CHROME_DIR" && zip -r "../download-duster-chrome.zip" .)

    echo "Chrome build complete: $DIST_DIR/download-duster-chrome.zip"
}

build_firefox() {
    echo "Building Firefox extension..."
    FIREFOX_DIR="$DIST_DIR/firefox"
    rm -rf "$FIREFOX_DIR"
    mkdir -p "$FIREFOX_DIR"

    # Copy files (uses the Firefox manifest, which swaps background.service_worker
    # for background.scripts and sets gecko_android strict_min_version)
    cp LICENSE background.js popup.html popup.css popup.js privacy.md "$FIREFOX_DIR"
    cp manifest.firefox.json "$FIREFOX_DIR/manifest.json"

    # Copy icons
    mkdir -p "$FIREFOX_DIR/icons"
    cp icons/icon16.png  "$FIREFOX_DIR/icons/icon16.png"
    cp icons/icon32.png  "$FIREFOX_DIR/icons/icon32.png"
    cp icons/icon48.png  "$FIREFOX_DIR/icons/icon48.png"
    cp icons/icon128.png "$FIREFOX_DIR/icons/icon128.png"

    # Copy assets
    cp -r assets "$FIREFOX_DIR/assets"

    # Create xpi for local development (release builds are signed via web-ext sign)
    (cd "$FIREFOX_DIR" && zip -r "../download-duster-firefox.xpi" .)

    echo "Firefox build complete: $DIST_DIR/download-duster-firefox.xpi"
}

# Simple argument parsing
if [[ "$1" == "-Chrome" ]]; then
    build_chrome
elif [[ "$1" == "-Firefox" ]]; then
    build_firefox
else
    build_chrome
    build_firefox
fi

echo ""
echo "Build complete! Check the '$DIST_DIR' folder."
