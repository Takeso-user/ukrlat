import {
  disablePageTransliteration,
  enablePageTransliteration,
  getIsTransliterationActive,
  togglePageTransliteration,
} from "./dom-transliterate";
import {
  disableInputTransliteration,
  enableInputTransliteration,
  transliterateCurrentSelection,
} from "./input-transliterate";
import { isUkrainianPage } from "./lang-detect";

export interface UkrLatSettings {
  autoPageTransliterate: boolean;
  liveInputTransliterate: boolean;
  siteOverrides?: Record<string, boolean>;
}

const DEFAULT_SETTINGS: UkrLatSettings = {
  autoPageTransliterate: true,
  liveInputTransliterate: false,
  siteOverrides: {},
};

function getStorageArea(): chrome.storage.StorageArea {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    return chrome.storage.sync;
  }
  return chrome.storage.local;
}

function getNormalizedHostname(): string {
  try {
    return window.location.hostname.toLowerCase();
  } catch {
    return "";
  }
}

function applySettings(settings: UkrLatSettings): void {
  const hostname = getNormalizedHostname();
  const overrides = settings.siteOverrides ?? {};
  const siteOverride = overrides[hostname];

  // 1. Determine page transliteration state
  if (siteOverride === true) {
    // User explicitly enabled for this site
    enablePageTransliteration(true);
  } else if (siteOverride === false) {
    // User explicitly disabled for this site
    disablePageTransliteration();
  } else if (settings.autoPageTransliterate) {
    // Auto mode: only transliterate if detected as Ukrainian
    enablePageTransliteration(false);
  } else {
    disablePageTransliteration();
  }

  // 2. Input transliteration
  if (settings.liveInputTransliterate) {
    enableInputTransliteration();
  } else {
    disableInputTransliteration();
  }
}

// Initial settings load
getStorageArea().get(DEFAULT_SETTINGS, (items) => {
  const settings = items as UkrLatSettings;
  applySettings(settings);

  // If the page is an SPA and content was loaded asynchronously, re-check once
  const hostname = getNormalizedHostname();
  const overrides = settings.siteOverrides ?? {};
  if (
    settings.autoPageTransliterate &&
    overrides[hostname] === undefined &&
    !getIsTransliterationActive()
  ) {
    setTimeout(() => {
      if (!getIsTransliterationActive()) {
        enablePageTransliteration(false);
      }
    }, 1500);
  }
});

// React to storage setting changes from popup or background
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

// Handle runtime messages from popup, background, or commands
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const action = message?.action;
    const hostname = getNormalizedHostname();

    if (action === "GET_PAGE_STATUS") {
      getStorageArea().get(DEFAULT_SETTINGS, (items) => {
        const settings = items as UkrLatSettings;
        const overrides = settings.siteOverrides ?? {};
        const siteOverride = overrides[hostname];

        sendResponse({
          hostname,
          isTransliterated: getIsTransliterationActive(),
          isUkrainian: isUkrainianPage(),
          siteOverride,
          autoPageTransliterate: settings.autoPageTransliterate,
        });
      });
      return true; // Keep message channel open for async response
    }

    if (action === "TOGGLE_PAGE") {
      const newState = togglePageTransliteration();
      sendResponse({ isTransliterated: newState });
      return false;
    }

    if (action === "FORCE_TRANSLITERATE_PAGE") {
      enablePageTransliteration(true);
      sendResponse({ isTransliterated: true });
      return false;
    }

    if (action === "RESTORE_PAGE") {
      disablePageTransliteration();
      sendResponse({ isTransliterated: false });
      return false;
    }

    if (action === "SET_SITE_OVERRIDE") {
      const overrideVal = message.override as boolean | undefined;
      getStorageArea().get(DEFAULT_SETTINGS, (items) => {
        const settings = items as UkrLatSettings;
        const overrides = { ...(settings.siteOverrides ?? {}) };

        if (overrideVal === undefined) {
          delete overrides[hostname];
        } else {
          overrides[hostname] = overrideVal;
        }

        getStorageArea().set({ siteOverrides: overrides }, () => {
          if (overrideVal === true) {
            enablePageTransliteration(true);
          } else if (overrideVal === false) {
            disablePageTransliteration();
          } else if (settings.autoPageTransliterate) {
            enablePageTransliteration(false);
          } else {
            disablePageTransliteration();
          }

          sendResponse({
            hostname,
            siteOverride: overrideVal,
            isTransliterated: getIsTransliterationActive(),
          });
        });
      });
      return true;
    }

    if (action === "TRANSLITERATE_SELECTION") {
      transliterateCurrentSelection();
      sendResponse({ status: "ok" });
      return false;
    }
  });
}
