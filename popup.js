/*
 * Download Duster - Popup UI Logic
 * Copyright (C) 2026 nichu42 and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Prune logs array based on logging policy
function pruneLogs(logs, policy) {
  if (policy === 'disabled') return [];
  if (!logs || logs.length === 0) return [];
  
  if (policy.startsWith('sweeps-')) {
    const limit = parseInt(policy.split('-')[1], 10) || 10;
    return logs.slice(0, limit);
  }
  
  if (policy.startsWith('time-')) {
    const days = parseInt(policy.split('-')[1], 10) || 7;
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return logs.filter(log => log.time >= cutoff);
  }
  
  return logs.slice(0, 10);
}

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const toggleActive = document.getElementById('toggle-active');
  const sliderRetention = document.getElementById('slider-retention');
  const valRetention = document.getElementById('val-retention');
  const btnDustNow = document.getElementById('btn-dust-now');
  const statTotalCleaned = document.getElementById('stat-total-cleaned');
  const statLastSweep = document.getElementById('stat-last-sweep');
  const logList = document.getElementById('log-list');
  const logoIcon = document.getElementById('logo-icon');
  const toggleDeleteFiles = document.getElementById('toggle-delete-files');

  // Sliders Non-linear Mapping Helpers
  
  // Retention (0 to 90) -> Minutes
  // 0: Immediate
  // 1-30: minutes (1m - 30m) (1-minute steps)
  // 31-36: minutes (35m - 60m / 1h) (5-minute steps: 30 + (val-30)*5)
  // 37-59: hours (2h - 24h) (val - 35 hours)
  // 60-88: days (2d - 30d) (val - 58 days)
  // 89: 60 Days
  // 90: 90 Days
  function sliderToMinutes(val) {
    val = parseInt(val, 10);
    if (val === 0) return 0;
    if (val <= 30) return val; // 1m to 30m
    if (val <= 36) return 30 + (val - 30) * 5; // 35m to 60m
    if (val <= 59) {
      const hrs = val - 35;
      return hrs * 60; // 2h to 24h
    }
    if (val <= 88) {
      const days = val - 58;
      return days * 24 * 60; // 2d to 30d
    }
    if (val === 89) return 60 * 24 * 60;
    if (val === 90) return 90 * 24 * 60;
    return 30 * 24 * 60; // default fallback
  }

  function minutesToSlider(min) {
    if (min === 0) return 0;
    if (min <= 30) return min; // 1m to 30m
    if (min < 60) {
      const extra = min - 30;
      const step = Math.round(extra / 5);
      return 30 + Math.max(1, Math.min(6, step)); // 35m to 60m
    }
    const hrs = min / 60;
    if (hrs <= 24) {
      return Math.round(hrs) + 35; // 1h is handled as 60m -> val=36
    }
    const days = Math.round(hrs / 24);
    if (days <= 30) {
      return days + 58; // 2d to 30d
    }
    if (days <= 60) return 89;
    return 90; // 90 days or higher
  }

  function formatRetentionLabel(val) {
    val = parseInt(val, 10);
    if (val === 0) return "No history (Delete instantly)";
    if (val === 1) return "1 Minute";
    if (val <= 30) return `${val} Minutes`;
    if (val <= 36) return `${30 + (val - 30) * 5} Minutes`;
    if (val <= 59) {
      const hrs = val - 35;
      if (hrs === 1) return "1 Hour";
      if (hrs === 24) return "1 Day";
      return `${hrs} Hours`;
    }
    if (val <= 88) {
      const days = val - 58;
      if (days === 1) return "1 Day";
      return `${days} Days`;
    }
    if (val === 89) return "60 Days";
    if (val === 90) return "90 Days";
    return "";
  }

  // Helper to disable and visually gray out physical deletion if retention is 0 (Delete instantly)
  function updateDeleteFilesState(sliderVal) {
    const isZero = parseInt(sliderVal, 10) === 0;
    const deleteFilesRow = document.getElementById('delete-files-row');
    if (toggleDeleteFiles) {
      if (isZero) {
        toggleDeleteFiles.checked = false;
        toggleDeleteFiles.disabled = true;
        if (deleteFilesRow) deleteFilesRow.classList.add('disabled');
      } else {
        toggleDeleteFiles.disabled = false;
        if (deleteFilesRow) deleteFilesRow.classList.remove('disabled');
        // Restore the stored value
        chrome.storage.local.get({ deleteFiles: false }, (data) => {
          if (toggleDeleteFiles && !toggleDeleteFiles.disabled) {
            toggleDeleteFiles.checked = data.deleteFiles;
          }
        });
      }
    }
  }

  // Helper to disable and visually gray out detailed logging toggle if logging is disabled
  function updateDetailedLoggingState(policy) {
    const isDisabled = policy === 'disabled';
    const toggleDetailedLogging = document.getElementById('toggle-detailed-logging');
    const detailedLoggingRow = document.getElementById('detailed-logging-row');
    if (toggleDetailedLogging) {
      if (isDisabled) {
        toggleDetailedLogging.disabled = true;
        if (detailedLoggingRow) detailedLoggingRow.classList.add('disabled');
      } else {
        toggleDetailedLogging.disabled = false;
        if (detailedLoggingRow) detailedLoggingRow.classList.remove('disabled');
      }
    }
  }



  // Trigger strings translation
  const triggerLabels = {
    'manual': 'Manual Sweep',
    'startup': 'Browser Startup',
    'alarm': 'Auto-Clean',
    'install': 'Setup Sweep',
    'instant': 'Instant Clean',
    'precise': 'Precise Clean'
  };

  // Convert timestamp to human-friendly relative string
  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Never';
    
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  }

  // Render recent activity log
  function renderLogs(logs) {
    if (!logList) return;

    // Clear existing children without using innerHTML
    while (logList.firstChild) {
      logList.removeChild(logList.firstChild);
    }

    if (!logs || logs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'log-empty';
      empty.textContent = 'No activity logged yet.';
      logList.appendChild(empty);
      return;
    }

    logs.forEach(log => {
      const timeStr = new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(log.time).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const trigger = log.trigger || '';
      const triggerKey = trigger.startsWith('one-shot-') ? 'precise' : trigger;
      const label = triggerLabels[triggerKey] || trigger || 'Sweep';
      const countText = log.count === 1 ? '1 file' : `${log.count} files`;
      const hasFiles = log.files && log.files.length > 0;

      const item = document.createElement('div');
      item.className = `log-item trigger-${triggerKey}`;
      if (hasFiles) {
        item.style.cursor = 'pointer';
      }

      const mainRow = document.createElement('div');
      mainRow.className = 'log-main-row';
      mainRow.style.display = 'flex';
      mainRow.style.justifyContent = 'space-between';
      mainRow.style.alignItems = 'center';
      mainRow.style.width = '100%';

      const info = document.createElement('div');
      info.className = 'log-info';
      const labelSpan = document.createElement('span');
      labelSpan.style.fontWeight = '500';
      labelSpan.textContent = label;
      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-time';
      timeSpan.textContent = `${dateStr}, ${timeStr}`;
      info.appendChild(labelSpan);
      info.appendChild(timeSpan);

      const countDiv = document.createElement('div');
      countDiv.className = 'log-count';
      countDiv.style.display = 'flex';
      countDiv.style.alignItems = 'center';
      countDiv.style.gap = '4px';
      const countSpan = document.createElement('span');
      countSpan.textContent = countText;
      countDiv.appendChild(countSpan);

      if (hasFiles) {
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'log-toggle-icon';
        toggleIcon.style.fontSize = '0.6rem';
        toggleIcon.style.opacity = '0.7';
        toggleIcon.textContent = '▼';
        countDiv.appendChild(toggleIcon);
      }

      mainRow.appendChild(info);
      mainRow.appendChild(countDiv);
      item.appendChild(mainRow);

      if (hasFiles) {
        const filesList = document.createElement('div');
        filesList.className = 'log-files-list';
        filesList.style.marginTop = '6px';
        filesList.style.paddingTop = '6px';
        filesList.style.borderTop = '1px dashed rgba(255,255,255,0.06)';
        filesList.style.width = '100%';
        filesList.style.display = 'none';

        log.files.forEach(file => {
          const fTime = new Date(file.downloadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const fDate = new Date(file.downloadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

          const fileEntry = document.createElement('div');
          fileEntry.className = 'log-file-entry';
          fileEntry.style.display = 'flex';
          fileEntry.style.justifyContent = 'space-between';
          fileEntry.style.fontSize = '0.68rem';
          fileEntry.style.color = 'var(--text-muted)';
          fileEntry.style.padding = '2px 0';
          fileEntry.style.gap = '12px';
          fileEntry.style.alignItems = 'baseline';

          const nameSpan = document.createElement('span');
          nameSpan.className = 'log-file-name';
          nameSpan.style.wordBreak = 'break-all';
          nameSpan.style.flexGrow = '1';
          nameSpan.style.textAlign = 'left';
          // textContent is safe; title attribute is set from the file name
          // (browser escapes it automatically).
          nameSpan.textContent = file.name;
          nameSpan.title = file.name;

          const fTimeSpan = document.createElement('span');
          fTimeSpan.className = 'log-file-time';
          fTimeSpan.style.fontSize = '0.58rem';
          fTimeSpan.style.opacity = '0.7';
          fTimeSpan.style.flexShrink = '0';
          fTimeSpan.textContent = `${fDate}, ${fTime}`;

          fileEntry.appendChild(nameSpan);
          fileEntry.appendChild(fTimeSpan);
          filesList.appendChild(fileEntry);
        });

        item.appendChild(filesList);

        item.addEventListener('click', () => {
          const isHidden = filesList.style.display === 'none';
          filesList.style.display = isHidden ? 'block' : 'none';
          const icon = item.querySelector('.log-toggle-icon');
          if (icon) {
            icon.textContent = isHidden ? '▲' : '▼';
          }
        });
      }

      logList.appendChild(item);
    });
  }

  // Load and display settings
  async function loadSettings() {
    const settings = await chrome.storage.local.get({
      enabled: false, // Start disabled by default
      retention: 1440,
      frequency: 360,
      deleteFiles: false,
      logPolicy: 'disabled',
      detailedLogging: true,
      stats: { totalCleaned: 0, lastCleaned: null },
      logs: []
    });

    // Sync select log policy dropdown
    const selectLogPolicy = document.getElementById('select-log-policy');
    if (selectLogPolicy) {
      selectLogPolicy.value = settings.logPolicy;
      updateDetailedLoggingState(settings.logPolicy);
    }

    // Sync detailed logging toggle
    const toggleDetailedLogging = document.getElementById('toggle-detailed-logging');
    if (toggleDetailedLogging) toggleDetailedLogging.checked = settings.detailedLogging;

    // Sync input controls
    if (toggleActive) toggleActive.checked = settings.enabled;
    if (toggleDeleteFiles) toggleDeleteFiles.checked = settings.deleteFiles;
    
    // Sync sliders
    const rVal = minutesToSlider(settings.retention);
    if (sliderRetention) {
      sliderRetention.value = rVal;
      valRetention.textContent = formatRetentionLabel(rVal);
      updateDeleteFilesState(rVal);
    }

    // Sync statistics
    if (statTotalCleaned) statTotalCleaned.textContent = settings.stats.totalCleaned || 0;
    if (statLastSweep) statLastSweep.textContent = formatRelativeTime(settings.stats.lastCleaned);

    // Sync log history
    renderLogs(settings.logs);
  }

  // Visual feedback animation and sweep execution
  function triggerManualSweep() {
    if (btnDustNow) btnDustNow.disabled = true;
    if (btnDustNow) btnDustNow.classList.add('active');
    if (logoIcon) logoIcon.classList.add('sweeping');

    const sweepText = document.getElementById('btn-text');
    let originalText = 'Dust Now';
    if (sweepText) {
      originalText = sweepText.textContent;
      sweepText.textContent = 'Sweeping...';
    }

    chrome.runtime.sendMessage({ action: 'dust-now' }, (response) => {
      setTimeout(() => {
        if (btnDustNow) btnDustNow.disabled = false;
        if (btnDustNow) btnDustNow.classList.remove('active');
        if (logoIcon) logoIcon.classList.remove('sweeping');
        if (sweepText) sweepText.textContent = originalText;

        if (response && response.success) {
          loadSettings();
        } else {
          console.error("Manual dust failed:", response ? response.error : 'No response');
        }
      }, 1000);
    });
  }

  // Toggle switch listener
  if (toggleActive) {
    toggleActive.addEventListener('change', async () => {
      const enabled = toggleActive.checked;
      await chrome.storage.local.set({ enabled });
    });
  }

  // Toggle delete files listener (destructive warning confirmation)
  if (toggleDeleteFiles) {
    toggleDeleteFiles.addEventListener('change', async () => {
      const checked = toggleDeleteFiles.checked;
      if (checked) {
        const confirmed = window.confirm(
          "Are you sure you want to enable physical file deletion?\n\n" +
          "When enabled, Download Duster will permanently delete the actual downloaded files from your disk when they expire.\n\n" +
          "⚠️ CRITICAL NOTE: Files will NOT go to the Recycle Bin and cannot be restored."
        );
        if (!confirmed) {
          toggleDeleteFiles.checked = false;
          return;
        }
      }
      await chrome.storage.local.set({ deleteFiles: toggleDeleteFiles.checked });
    });
  }

  // Live update retention label as user drags
  if (sliderRetention) {
    sliderRetention.addEventListener('input', () => {
      const rVal = sliderRetention.value;
      if (valRetention) valRetention.textContent = formatRetentionLabel(rVal);
      updateDeleteFilesState(rVal);
    });
  }

  // Save retention setting when user finishes dragging
  if (sliderRetention) {
    sliderRetention.addEventListener('change', async () => {
      const retention = sliderToMinutes(sliderRetention.value);
      const updates = { retention };
      // Safeguard: If retention is set to 0, automatically deactivate physical deletion
      if (retention === 0) {
        updates.deleteFiles = false;
      }
      await chrome.storage.local.set(updates);
    });
  }

  // Handle manual trigger button click
  if (btnDustNow) {
    btnDustNow.addEventListener('click', () => {
      triggerManualSweep();
    });
  }

  // Reload settings automatically when storage changes in the background
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      loadSettings();
    }
  });

  // Initial load
  loadSettings();

  // Set version in footer
  const extVersion = document.getElementById('ext-version');
  if (extVersion) {
    extVersion.textContent = chrome.runtime.getManifest().version;
  }

  // Periodically refresh relative times (every 30 seconds)
  setInterval(async () => {
    const settings = await chrome.storage.local.get({
      stats: { lastCleaned: null }
    });
    if (settings.stats && settings.stats.lastCleaned && statLastSweep) {
      statLastSweep.textContent = formatRelativeTime(settings.stats.lastCleaned);
    }
  }, 30000);

  // Navigation Event Listeners
  const btnInfo = document.getElementById('btn-info');
  const btnHistory = document.getElementById('btn-history');
  const lnkAbout = document.getElementById('lnk-about');
  const btnBack = document.getElementById('btn-back');
  const btnBackHistory = document.getElementById('btn-back-history');
  const viewDashboard = document.getElementById('view-dashboard');
  const viewAbout = document.getElementById('view-about');
  const viewHistory = document.getElementById('view-history');
  const cardLastSweep = document.getElementById('card-last-sweep');
  const aboutVersionVal = document.getElementById('about-version-val');

  function showAboutView(e) {
    if (e) e.preventDefault();
    if (viewDashboard && viewAbout && viewHistory) {
      viewDashboard.classList.add('hidden');
      viewHistory.classList.add('hidden');
      viewAbout.classList.remove('hidden');
    }
  }

  function showHistoryView(e) {
    if (e) e.preventDefault();
    if (viewDashboard && viewAbout && viewHistory) {
      viewDashboard.classList.add('hidden');
      viewAbout.classList.add('hidden');
      viewHistory.classList.remove('hidden');
    }
  }

  function showDashboardView() {
    if (viewDashboard && viewAbout && viewHistory) {
      viewAbout.classList.add('hidden');
      viewHistory.classList.add('hidden');
      viewDashboard.classList.remove('hidden');
    }
  }

  if (btnInfo) btnInfo.addEventListener('click', showAboutView);
  if (btnHistory) btnHistory.addEventListener('click', showHistoryView);
  if (cardLastSweep) cardLastSweep.addEventListener('click', showHistoryView);
  if (lnkAbout) lnkAbout.addEventListener('click', showAboutView);
  if (btnBack) btnBack.addEventListener('click', showDashboardView);
  if (btnBackHistory) btnBackHistory.addEventListener('click', showDashboardView);

  // Keyboard navigation: Escape key goes back to dashboard if About or History is open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (viewAbout && !viewAbout.classList.contains('hidden')) {
        showDashboardView();
      } else if (viewHistory && !viewHistory.classList.contains('hidden')) {
        showDashboardView();
      }
    }
  });

  const selectLogPolicy = document.getElementById('select-log-policy');
  if (selectLogPolicy) {
    selectLogPolicy.addEventListener('change', async () => {
      const logPolicy = selectLogPolicy.value;
      const data = await chrome.storage.local.get({ logs: [] });
      const pruned = pruneLogs(data.logs, logPolicy);
      await chrome.storage.local.set({ logPolicy, logs: pruned });
      renderLogs(pruned);
      updateDetailedLoggingState(logPolicy);
    });
  }

  const toggleDetailedLogging = document.getElementById('toggle-detailed-logging');
  if (toggleDetailedLogging) {
    toggleDetailedLogging.addEventListener('change', async () => {
      const detailedLogging = toggleDetailedLogging.checked;
      await chrome.storage.local.set({ detailedLogging });
    });
  }

  const btnClearLogs = document.getElementById('btn-clear-logs');
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      const confirmed = window.confirm("Are you sure you want to clear all recent activity logs?");
      if (confirmed) {
        await chrome.storage.local.set({ logs: [] });
        renderLogs([]);
      }
    });
  }

  if (aboutVersionVal) {
    aboutVersionVal.textContent = chrome.runtime.getManifest().version;
  }
});
