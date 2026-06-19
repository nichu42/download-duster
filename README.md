# <img src="icons/icon48.png" width="38" height="38" align="center" style="vertical-align: middle;"/> Download Duster

[![Latest Release](https://img.shields.io/gitea/v/release/nichu42/download-duster?gitea_url=https://codeberg.org&sort=semver&label=Latest+Release)](https://codeberg.org/nichu42/download-duster/releases)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/YOUR_CHROME_EXT_ID?logo=google-chrome&logoColor=white&label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/YOUR_CHROME_EXT_ID)
[![Firefox Add-on](https://img.shields.io/amo/v/download-duster?logo=firefox&logoColor=white&label=Firefox%20Add-on)](https://addons.mozilla.org/firefox/addon/download-duster/)
[![Liberapay Patrons](https://img.shields.io/liberapay/patrons/nichu42.svg?logo=liberapay)](https://liberapay.com/nichu42/donate)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)

A browser extension that automatically sweeps old download history on startup and scheduled intervals to keep your list clean.

Download Duster operates **entirely locally** on your device and does not collect or transmit any data.

## ✨ Features

- **🧹 Automatic Cleanups** — Sweeps download history in the background based on your retention settings.
- **⏱️ Flexible Retention** — Keep history for minutes, hours, days, or delete instantly (configurable via a slider).
- **⚠️ Physical File Deletion (Optional)** — Option to permanently delete the actual files from your disk (bypassing the Recycle Bin).
- **🖱️ Right-Click Quick Action** — Trigger a manual cleanup ("Dust Now") by right-clicking the toolbar icon.
- **📊 Activity Logging & Statistics (Configurable)** — View total files cleaned and last sweep time. Activity logs are optional and stored locally only.
- **🎨 Glassmorphic Dark UI** — Beautiful dark dashboard layout with smooth transitions and hover micro-animations.
- **🔐 Privacy First** — Zero trackers, telemetry, or server communication.

## 🚀 Quick start

1. Install the extension for your browser.
2. Select how long to keep history using the **Keep download history for** slider.
3. Toggle the **Also delete files from disk** option if you wish to wipe physical files (optional).
4. Click **Dust Now** to run an immediate manual sweep, or let the extension handle cleanups automatically in the background.

## 📥 Installation

### 🌐 Chromium-based browsers (Chrome, Edge, Brave, Vivaldi, etc.)
Available soon in the Chrome Web Store.
*(Or see the manual installation section below.)*

### 🦊 Firefox
Available soon on the Mozilla Add-ons page.
*(Or see the manual installation section below.)*

---

## 🔐 Permissions and privacy

Download Duster is built with privacy in mind. It requires the following permissions to operate locally on your device:
- **`downloads`** — Required to query download history, sweep expired entries, and delete actual files from your disk if enabled.
- **`alarms`** — Required to trigger background cleanups at regular intervals.
- **`storage`** — Required to save your configuration, activity logs, and cleanup statistics.
- **`contextMenus`** — Required to add the "Dust Now" option to the extension's right-click context menu.

All configuration, statistics, and optional activity logs are stored locally on your device in your browser's sandboxed storage (`chrome.storage.local`). Activity logging is turned off by default. The extension is entirely offline and does not connect to external servers, track your habits, or transmit any data.

---

## 💬 Issues & Community

Found a bug or have a feature idea? [Open an issue on Codeberg](https://codeberg.org/nichu42/download-duster/issues). Contributions are welcome.

If you find this extension useful, please consider supporting:

[![Donate using Liberapay](https://liberapay.com/assets/widgets/donate.svg)](https://liberapay.com/nichu42/donate)
[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/nichu42)

## 📄 Warranty & License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU General Public License](https://www.gnu.org/licenses/gpl-3.0.html) for more details.

---

### ⚙️ Advanced: Manual Installation

#### Chromium-based browsers (Chrome, Edge, Brave, Vivaldi, etc.)
1. Download `download-duster-chrome.zip` from the [Releases page](https://codeberg.org/nichu42/download-duster/releases).
2. Unzip the archive.
3. Open your browser's extensions page (e.g., `chrome://extensions/`).
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the unzipped folder.

#### Firefox
1. Download `download-duster-firefox.xpi` from the [Releases page](https://codeberg.org/nichu42/download-duster/releases).
2. Open `about:addons` in Firefox.
3. Click the gear icon and select **Install Add-on From File...**, then select the `.xpi` file.

---

## 🛠️ Development

### Build from source
Packages are written to the `dist/` directory:

```sh
# Windows
.\build.ps1

# macOS / Linux
./build.sh
```

### Load in browser
- **Chromium-based**: Open `chrome://extensions/`, enable Developer mode, and click **Load unpacked** pointing to the project root.
- **Firefox**: Build the project first, then go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and select `dist/firefox/manifest.json`.
