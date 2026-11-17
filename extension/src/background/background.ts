// Background service worker for UkrLat extension

chrome.runtime.onInstalled.addListener(() => {
  const storage =
    typeof chrome.storage !== "undefined" && chrome.storage.sync
      ? chrome.storage.sync
      : chrome.storage.local;

  storage.get(
    ["autoPageTransliterate", "liveInputTransliterate", "siteOverrides"],
    (items) => {
      storage.set({
        autoPageTransliterate: items.autoPageTransliterate ?? true,
        liveInputTransliterate: items.liveInputTransliterate ?? false,
        siteOverrides: items.siteOverrides ?? {},
      });
    },
  );

  // Setup context menu actions
  if (chrome.contextMenus) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "ukrlat-transliterate-selection",
        title: "Транслітерувати виділений текст (Alt+U)",
        contexts: ["selection", "editable"],
      });

      chrome.contextMenus.create({
        id: "ukrlat-toggle-page",
        title: "Увімкнути/вимкнути латинку на сторінці",
        contexts: ["page", "action"],
      });
    });
  }
});

// Handle context menu clicks
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id) return;

    if (info.menuItemId === "ukrlat-transliterate-selection") {
      chrome.tabs.sendMessage(
        tab.id,
        { action: "TRANSLITERATE_SELECTION" },
        () => {
          if (chrome.runtime.lastError) {
            // Tab doesn't have content script injected (e.g. system page)
          }
        },
      );
    } else if (info.menuItemId === "ukrlat-toggle-page") {
      chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_PAGE" }, () => {
        if (chrome.runtime.lastError) {
          // Tab doesn't have content script injected
        }
      });
    }
  });
}

// Handle keyboard shortcut commands
if (chrome.commands) {
  chrome.commands.onCommand.addListener((command, tab) => {
    if (!tab?.id) return;

    if (command === "transliterate-selection") {
      chrome.tabs.sendMessage(
        tab.id,
        { action: "TRANSLITERATE_SELECTION" },
        () => {
          if (chrome.runtime.lastError) {
            // Ignore runtime errors on unsupported tabs
          }
        },
      );
    } else if (command === "toggle-page") {
      chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_PAGE" }, () => {
        if (chrome.runtime.lastError) {
          // Ignore runtime errors on unsupported tabs
        }
      });
    }
  });
}
