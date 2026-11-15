// Background service worker for UkrLat extension

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings if not yet defined
  const storage = chrome.storage.sync || chrome.storage.local;
  storage.get(["autoPageTransliterate", "liveInputTransliterate"], (items) => {
    storage.set({
      autoPageTransliterate: items.autoPageTransliterate ?? true,
      liveInputTransliterate: items.liveInputTransliterate ?? false,
    });
  });

  // Create context menu for selected text
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: "ukrlat-transliterate-selection",
      title: "Транслітерувати латинкою (UkrLat)",
      contexts: ["selection", "editable"],
    });
  }
});

// Context menu click listener
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ukrlat-transliterate-selection" && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "TRANSLITERATE_SELECTION" });
    }
  });
}

// Keyboard shortcut command listener
if (chrome.commands) {
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "transliterate-selection" && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "TRANSLITERATE_SELECTION" });
    } else if (command === "toggle-page" && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_PAGE" });
    }
  });
}
