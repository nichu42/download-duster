# Privacy Policy for Download Duster

Download Duster is committed to protecting your privacy. This Privacy Policy details how the extension handles user data.

## 1. No External Data Collection or Transmission
Download Duster operates **entirely locally** on your device. 
* **No Server Communication:** The extension does not connect to any external servers, APIs, or databases.
* **No Telemetry or Tracking:** The extension does not collect, track, or transmit any analytics, telemetry, or usage statistics about your browsing habits or download history to the developer or any third parties.
* **Optional Local-Only Logging:** The extension can record a list of swept files locally on your device to display in the Recent Activity screen. This remains entirely offline within your browser sandbox, is turned off by default, is fully under your control, and can be disabled or cleared at any time.
* **No Sharing:** Since no data is collected or transmitted, no data is sold, rented, shared, or otherwise disclosed to third parties.

## 2. Permissions Explained
The extension requires the following permissions to function. All permissions are used strictly for local operations on your device:
* **`downloads`:** Required to query your download history, sweep expired entries from the browser's download record, and (if manually enabled) delete physical files from your disk.
* **`alarms`:** Required to schedule background cleanups based on your retention settings.
* **`storage`:** Required to save your settings (retention time, delete files toggle, active state), accumulated cleanup statistics, and recent activity logs locally within your browser profile.
* **`contextMenus`:** Required to add the "Dust Now" option to the extension's right-click toolbar menu.

## 3. Data Storage & Activity Logs
All configurations, logs, and statistics are stored locally on your device via the browser's extension storage API (using `chrome.storage.local` or `browser.storage.local`). This data remains sandboxed within your browser profile and is deleted automatically if you uninstall the extension.

* **Configurable Activity Logging:** The extension logs cleanup sweeps locally to display them in the Recent Activity panel. You can customize the log retention policy (keeping logs for a specific number of sweeps or duration of time), clear all logs manually, or disable logging completely. By default, logging is set to "Don't log (Disabled)".
* **Optional Detailed Logging:** If logging is active, you can opt to include or exclude detailed metadata (individual file names and timestamps) within your sweep records. When detailed logging is disabled, the logs only track aggregate statistics (e.g., total count of files cleared and the trigger source), leaving out specific filenames and timestamps entirely.

## 4. Physical File Deletion
If you choose to enable the **"Also delete files from disk"** setting:
* Download Duster will permanently remove files associated with expired downloads from your local storage drive.
* This operation bypasses the operating system's Recycle Bin / Trash and is non-reversible.
* This process is handled entirely by your local browser runtime via the standard extension downloads API (using `chrome.downloads.removeFile` or `browser.downloads.removeFile`). No file details are transmitted online.

## 5. Contact & Support
Download Duster is an open-source project. You can inspect the source code, report bugs, or contact the maintainers at:
https://codeberg.org/nichu42/download-duster
