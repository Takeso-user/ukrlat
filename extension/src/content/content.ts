import {
  disablePageTransliteration,
  enablePageTransliteration,
} from "./dom-transliterate";
import {
  disableInputTransliteration,
  enableInputTransliteration,
  transliterateCurrentSelection,
} from "./input-transliterate";

interface UkrLatSettings {
  autoPageTransliterate: boolean;
  liveInputTransliterate: boolean;
}

const DEFAULT_SETTINGS: UkrLatSettings = {
  autoPageTransliterate: true,
  liveInputTransliterate: false,
};

function getStorageArea(): chrome.storage.StorageArea {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    return chrome.storage.sync;
  }
  return chrome.storage.local;
}

function applySettings(settings: UkrLatSettings): void {
  if (settings.autoPageTransliterate) {
    enablePageTransliteration();
  } else {
    disablePageTransliteration();
  }

  if (settings.liveInputTransliterate) {
    enableInputTransliteration();
  } else {
    disableInputTransliteration();
  }
}

// Initialize settings and apply
getStorageArea().get(DEFAULT_SETTINGS, (items) => {
  const settings = items as UkrLatSettings;
  applySettings(settings);
});

// React to live setting changes from the popup
if (
  typeof chrome !== "undefined" &&
  chrome.storage &&
  chrome.storage.onChanged
) {
  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === "sync" || areaName === "local") {
      getStorageArea().get(DEFAULT_SETTINGS, (items) => {
        applySettings(items as UkrLatSettings);
      });
    }
  });
}

// React to commands / context menu actions
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === "TRANSLITERATE_SELECTION") {
      transliterateCurrentSelection();
      sendResponse({ status: "ok" });
    } else if (message?.action === "TOGGLE_PAGE") {
      getStorageArea().get(DEFAULT_SETTINGS, (items) => {
        const current = items as UkrLatSettings;
        const updated = !current.autoPageTransliterate;
        getStorageArea().set({ autoPageTransliterate: updated }, () => {
          sendResponse({ autoPageTransliterate: updated });
        });
      });
      return true; // Keep message channel open for async response
    }
  });
}
