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
    cp -r icons "$CHROME_DIR/icons"
    rm -f "$CHROME_DIR/icons"/*.ps1
    rm -f "$CHROME_DIR/icons"/*.html

    # Create zip
    (cd "$CHROME_DIR" && zip -r "../download-duster-chrome.zip" .)

    echo "Chrome build complete: $DIST_DIR/download-duster-chrome.zip"
}

build_firefox() {
    echo "Building Firefox extension..."
    FIREFOX_DIR="$DIST_DIR/firefox"
    rm -rf "$FIREFOX_DIR"
    mkdir -p "$FIREFOX_DIR"

    # Copy files (uses the same manifest.json)
    cp LICENSE manifest.json background.js popup.html popup.css popup.js privacy.md "$FIREFOX_DIR"

    # Copy icons
    cp -r icons "$FIREFOX_DIR/icons"
    rm -f "$FIREFOX_DIR/icons"/*.ps1
    rm -f "$FIREFOX_DIR/icons"/*.html

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
