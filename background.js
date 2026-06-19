/*
 * Download Duster - A browser extension to automatically clean download history.
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

// Extract basename from absolute file path
function getBasename(path) {
  if (!path) return 'Unknown File';
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || 'Unknown File';
}

// Core cleanup execution
async function performCleanup(triggerType) {
  try {
    const settings = await chrome.storage.local.get({
      enabled: false, // Default disabled
      retention: 1440, // default 24 hours (in minutes)
      deleteFiles: false,
      logPolicy: 'disabled',
      detailedLogging: true,
      stats: { totalCleaned: 0, lastCleaned: null },
      logs: []
    });

    // If auto-clean is disabled, skip unless it's a manual request
    if (!settings.enabled && triggerType !== 'manual') {
      return { success: true, count: 0 };
    }

    const retentionMinutes = parseInt(settings.retention, 10);
    const cutoffTime = Date.now() - (retentionMinutes * 60 * 1000);

    // Search downloads.
    // Querying with endedBefore: we pass an ISO string of the cutoff time.
    // Note: completed and interrupted downloads have an endTime, in_progress do not.
    const cutoffDate = new Date(cutoffTime);
    const query = {
      endedBefore: cutoffDate.toISOString()
    };

    return new Promise((resolve) => {
      chrome.downloads.search(query, async (items) => {
        if (chrome.runtime.lastError) {
          console.error("Download Duster: Error searching downloads:", chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        // Additional safety filter: ignore files still in progress
        const itemsToErase = items.filter(item => item.state !== 'in_progress');

        if (itemsToErase.length === 0) {
          const lastCleaned = Date.now();
          await chrome.storage.local.set({
            stats: {
              ...settings.stats,
              lastCleaned: lastCleaned
            },
            logs: pruneLogs([
              { time: lastCleaned, count: 0, trigger: triggerType, files: [] },
              ...settings.logs
            ], settings.logPolicy)
          });
          resolve({ success: true, count: 0 });
          return;
        }

        let deletedCount = 0;
        const cleanedFiles = [];

        for (const item of itemsToErase) {
          try {
            const basename = getBasename(item.filename);
            const downloadedTime = new Date(item.endTime || item.startTime).getTime();

            if (settings.deleteFiles) {
              await new Promise((resolveRemove) => {
                chrome.downloads.removeFile(item.id, () => {
                  if (chrome.runtime.lastError) {
                    console.warn(`Download Duster: Failed to remove physical file for ID ${item.id} (might be already moved/deleted):`, chrome.runtime.lastError);
                  }
                  resolveRemove();
                });
              });
            }
            await new Promise((resolveErase, rejectErase) => {
              chrome.downloads.erase({ id: item.id }, () => {
                if (chrome.runtime.lastError) {
                  rejectErase(chrome.runtime.lastError);
                } else {
                  resolveErase();
                }
              });
            });
            deletedCount++;
            if (settings.detailedLogging) {
              cleanedFiles.push({ name: basename, downloadedAt: downloadedTime });
            }
          } catch (err) {
            console.error(`Download Duster: Failed to clean download ID ${item.id}:`, err);
          }
        }

        const lastCleaned = Date.now();
        const totalCleaned = (settings.stats.totalCleaned || 0) + deletedCount;

        await chrome.storage.local.set({
          stats: {
            totalCleaned: totalCleaned,
            lastCleaned: lastCleaned
          },
          logs: pruneLogs([
            { 
              time: lastCleaned, 
              count: deletedCount, 
              trigger: triggerType, 
              files: cleanedFiles 
            },
            ...settings.logs
          ], settings.logPolicy)
        });

        console.log(`Download Duster: Cleaned ${deletedCount} downloads. Trigger: ${triggerType}`);
        resolve({ success: true, count: deletedCount });
      });
    });
  } catch (err) {
    console.error("Download Duster: Error during cleanup:", err);
    return { success: false, error: err.message };
  }
}

// Calculate optimal clean interval (in minutes) based on retention time
function calculateCleanupFrequency(retentionMinutes) {
  if (retentionMinutes === 0) return 60;    // 1 hour check (since onChanged runs instantly)
  if (retentionMinutes <= 15) return 5;     // check every 5 mins for short retentions
  if (retentionMinutes <= 60) return 15;    // check every 15 mins for retentions up to 1 hour
  if (retentionMinutes <= 360) return 60;   // check every 1 hour for retentions up to 6 hours
  if (retentionMinutes <= 1440) return 180; // check every 3 hours for retentions up to 1 day
  if (retentionMinutes <= 10080) return 720; // check every 12 hours for retentions up to 7 days
  return 1440; // check every 24 hours (1 day) for retentions > 7 days
}

// Schedule or reschedule the single precise alarm based on remaining unexpired downloads
async function scheduleNextPreciseAlarm() {
  try {
    const settings = await chrome.storage.local.get({
      enabled: false, // Default disabled
      retention: 1440
    });

    if (!settings.enabled) {
      await chrome.alarms.clear('cleanup-precise');
      return;
    }

    const retention = parseInt(settings.retention, 10);
    if (retention < 1 || retention > 60) {
      // Precise alarm is only for retention between 1 and 60 minutes
      await chrome.alarms.clear('cleanup-precise');
      return;
    }

    const now = Date.now();
    const cutoffTime = now - (retention * 60 * 1000);

    // Query downloads ended after the cutoff time (meaning they have not expired yet)
    const query = {
      endedAfter: new Date(cutoffTime).toISOString()
    };

    chrome.downloads.search(query, async (items) => {
      if (chrome.runtime.lastError) {
        console.error("Download Duster: Error searching downloads for precise alarm scheduling:", chrome.runtime.lastError);
        return;
      }

      // Filter to only items that have ended and are not in_progress
      const activeItems = items.filter(item => 
        item.state !== 'in_progress' && (item.endTime || item.startTime)
      );

      if (activeItems.length === 0) {
        await chrome.alarms.clear('cleanup-precise');
        console.log("Download Duster: No active unexpired downloads in the precise window. Precise alarm cleared.");
        return;
      }

      let nextExpirationTime = null;

      for (const item of activeItems) {
        const itemTime = new Date(item.endTime || item.startTime).getTime();
        const expTime = itemTime + (retention * 60 * 1000);
        if (nextExpirationTime === null || expTime < nextExpirationTime) {
          nextExpirationTime = expTime;
        }
      }

      if (nextExpirationTime !== null) {
        // Chrome requires 'when' to be in the future.
        // If it is in the past or immediately now, set it to fire in 1 second.
        const triggerTime = Math.max(nextExpirationTime, now + 1000);
        
        // Overwrites any existing precise alarm with the new earliest target time
        chrome.alarms.create('cleanup-precise', { when: triggerTime });
        const secondsRemaining = Math.round((triggerTime - now) / 1000);
        console.log(`Download Duster: Scheduled precise alarm to fire in ${secondsRemaining} seconds.`);
      } else {
        await chrome.alarms.clear('cleanup-precise');
      }
    });
  } catch (err) {
    console.error("Download Duster: Error scheduling precise alarm:", err);
  }
}

// Manage background alarm scheduling
async function updateAlarmSchedule() {
  const settings = await chrome.storage.local.get({
    enabled: false, // Default disabled
    retention: 1440 // default 24 hours
  });

  await chrome.alarms.clear('cleanup-alarm');

  if (settings.enabled) {
    const retention = parseInt(settings.retention, 10);
    const frequency = calculateCleanupFrequency(retention);

    chrome.alarms.create('cleanup-alarm', {
      periodInMinutes: frequency
    });
    console.log(`Download Duster: Scheduled background alarm every ${frequency} minutes based on retention of ${retention} minutes.`);
    
    // Manage precise alarm
    await scheduleNextPreciseAlarm();
  } else {
    await chrome.alarms.clear('cleanup-precise');
    console.log('Download Duster: Background alarms disabled.');
  }
}

// Listen for startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Download Duster: Browser startup detected. Running sweep...");
  performCleanup('startup');
});

// Listen for install / update (using standard synchronous callback listener for worker reliability)
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Download Duster: Extension installed/updated. Initializing settings...");
  
  // Create right-click context menu for the toolbar icon
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "dust-now-menu",
      title: "Dust Now",
      contexts: ["action"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn("Download Duster: Error creating context menu:", chrome.runtime.lastError.message);
      }
    });
  });

  chrome.storage.local.get(['enabled', 'retention', 'stats', 'logs', 'deleteFiles', 'logPolicy', 'detailedLogging'], (settings) => {
    const updates = {};
    if (settings.enabled === undefined) updates.enabled = false; // Start disabled
    if (settings.retention === undefined) updates.retention = 1440; // 24 hours
    if (settings.deleteFiles === undefined) updates.deleteFiles = false; // Default false
    if (settings.stats === undefined) updates.stats = { totalCleaned: 0, lastCleaned: null };
    if (settings.logs === undefined) updates.logs = [];
    if (settings.logPolicy === undefined) updates.logPolicy = 'disabled'; // Default is 'disabled'
    if (settings.detailedLogging === undefined) updates.detailedLogging = true; // Default detailed logging is enabled

    const finalizeInstall = () => {
      updateAlarmSchedule().catch((err) => {
        console.error("Download Duster: Failed to update alarm schedule on install:", err);
      });
    };

    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates, finalizeInstall);
    } else {
      finalizeInstall();
    }
  });
});

// Listen for alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup-alarm') {
    console.log("Download Duster: Alarm triggered background sweep...");
    performCleanup('alarm');
  } else if (alarm.name === 'cleanup-precise') {
    console.log("Download Duster: Precise alarm triggered sweep...");
    performCleanup('precise').then(() => {
      scheduleNextPreciseAlarm();
    });
  }
});

// Watch storage changes to re-schedule alarms immediately
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.enabled || changes.retention) {
      console.log("Download Duster: Scheduling settings updated. Re-scheduling alarm...");
      updateAlarmSchedule();
    }
  }
});

// Listen for completed downloads to trigger instant cleanups if retention is set to 0
chrome.downloads.onChanged.addListener(async (delta) => {
  if (delta.state && (delta.state.current === 'complete' || delta.state.current === 'interrupted')) {
    const settings = await chrome.storage.local.get({
      enabled: true,
      retention: 1440,
      deleteFiles: false
    });

    if (!settings.enabled) return;

    const retention = parseInt(settings.retention, 10);
    if (retention === 0) {
      console.log(`Download Duster: Download ${delta.id} finished. Wiping instantly...`);
      
      const eraseItem = () => {
        chrome.downloads.search({ id: delta.id }, (items) => {
          const item = items && items[0];
          const filename = item ? item.filename : 'Unknown File';
          const downloadedTime = item ? new Date(item.endTime || item.startTime).getTime() : Date.now();
          const basename = getBasename(filename);

          chrome.downloads.erase({ id: delta.id }, async () => {
            if (chrome.runtime.lastError) {
              performCleanup('instant');
            } else {
              console.log(`Download Duster: Erased download ID ${delta.id} instantly.`);
              // Update stats
              const statsSettings = await chrome.storage.local.get({
                stats: { totalCleaned: 0, lastCleaned: null },
                logPolicy: 'disabled',
                detailedLogging: true,
                logs: []
              });
              const lastCleaned = Date.now();
              const totalCleaned = (statsSettings.stats.totalCleaned || 0) + 1;
              const filesToLog = statsSettings.detailedLogging ? [{ name: basename, downloadedAt: downloadedTime }] : [];
              await chrome.storage.local.set({
                stats: {
                  totalCleaned: totalCleaned,
                  lastCleaned: lastCleaned
                },
                logs: pruneLogs([
                  { 
                    time: lastCleaned, 
                    count: 1, 
                    trigger: 'instant',
                    files: filesToLog
                  },
                  ...statsSettings.logs
                ], statsSettings.logPolicy)
              });
            }
          });
        });
      };

      // Safety check: Never delete physical files when retention is 0 (immediate history wipe)
      // to avoid deleting downloads the second they complete.
      eraseItem();
    } else if (retention >= 1 && retention <= 60) {
      console.log(`Download Duster: Download ${delta.id} finished. Rescheduling precise alarm...`);
      await scheduleNextPreciseAlarm();
    }
  }
});

// Handle manual sweep requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'dust-now') {
    performCleanup('manual').then((res) => {
      sendResponse(res);
    });
    return true; // Keep message port open for async response
  }
});

// Handle toolbar context menu actions
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "dust-now-menu") {
    console.log("Download Duster: Context menu 'Dust Now' clicked. Running manual sweep...");
    performCleanup('manual');
  }
});
