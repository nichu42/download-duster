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

# Create a zip archive with forward-slash entry names.
# AMO's archive validator rejects any entry containing a backslash, so
# PowerShell's Compress-Archive and ZipFile.CreateFromDirectory (which on
# Windows write backslash separators) are not usable here.
# See mozilla/addons-server src/olympia/files/utils.py.
function New-FwdZip {
    param(
        [Parameter(Mandatory)][string]$SourceDir,
        [Parameter(Mandatory)][string]$DestinationPath
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    if (Test-Path -LiteralPath $DestinationPath) {
        Remove-Item -LiteralPath $DestinationPath -Force
    }

    $base = (Resolve-Path -LiteralPath $SourceDir).ProviderPath
    $archive = [System.IO.Compression.ZipFile]::Open(
        $DestinationPath,
        [System.IO.Compression.ZipArchiveMode]::Create
    )
    try {
        $files = Get-ChildItem -LiteralPath $base -Recurse -File
        foreach ($file in $files) {
            $rel = $file.FullName.Substring($base.Length).TrimStart('\','/') -replace '\\', '/'
            $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
            $src = [System.IO.File]::OpenRead($file.FullName)
            try {
                $dst = $entry.Open()
                try { $src.CopyTo($dst) }
                finally { $dst.Dispose() }
            } finally {
                $src.Dispose()
            }
        }
    } finally {
        $archive.Dispose()
    }
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
    New-Item -ItemType Directory -Path "$chromeDir\icons" | Out-Null
    Copy-Item "icons\icon16.png"  "$chromeDir\icons\icon16.png"
    Copy-Item "icons\icon32.png"  "$chromeDir\icons\icon32.png"
    Copy-Item "icons\icon48.png"  "$chromeDir\icons\icon48.png"
    Copy-Item "icons\icon128.png" "$chromeDir\icons\icon128.png"

    # Copy assets
    Copy-Item -Recurse "assets" "$chromeDir\assets"

    # Create zip (with forward-slash entry names — required by AMO)
    $zipPath = "$distDir\download-duster-chrome.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath
    }
    New-FwdZip -SourceDir $chromeDir -DestinationPath $zipPath

    Write-Host "Chrome build complete: $zipPath" -ForegroundColor Green
}

function Build-Firefox {
    Write-Host "Building Firefox extension..." -ForegroundColor Cyan

    $firefoxDir = "$distDir\firefox"
    if (Test-Path $firefoxDir) {
        Remove-Item -Recurse -Force $firefoxDir
    }
    New-Item -ItemType Directory -Path $firefoxDir | Out-Null

    # Copy files (Firefox uses its own manifest without background.service_worker
    # and with gecko_android strict_min_version)
    $files = @(
        "LICENSE",
        "background.js",
        "popup.html",
        "popup.css",
        "popup.js",
        "privacy.md"
    )

    foreach ($file in $files) {
        Copy-Item $file $firefoxDir
    }

    Copy-Item "manifest.firefox.json" "$firefoxDir\manifest.json"

    # Copy icons
    New-Item -ItemType Directory -Path "$firefoxDir\icons" | Out-Null
    Copy-Item "icons\icon16.png"  "$firefoxDir\icons\icon16.png"
    Copy-Item "icons\icon32.png"  "$firefoxDir\icons\icon32.png"
    Copy-Item "icons\icon48.png"  "$firefoxDir\icons\icon48.png"
    Copy-Item "icons\icon128.png" "$firefoxDir\icons\icon128.png"

    # Copy assets
    Copy-Item -Recurse "assets" "$firefoxDir\assets"

    # Create xpi (with forward-slash entry names — required by AMO)
    $xpiPath = "$distDir\download-duster-firefox.xpi"
    if (Test-Path $xpiPath) {
        Remove-Item $xpiPath
    }
    New-FwdZip -SourceDir $firefoxDir -DestinationPath $xpiPath

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
