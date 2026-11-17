import { transliterateWithCase } from "../transliterate";

interface PageStatusResponse {
  hostname: string;
  isTransliterated: boolean;
  isUkrainian: boolean;
  siteOverride?: boolean;
  autoPageTransliterate: boolean;
}

function getStorage(): chrome.storage.StorageArea {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    return chrome.storage.sync;
  }
  return chrome.storage.local;
}

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const toggleAutoPage = document.getElementById(
    "toggleAutoPage",
  ) as HTMLInputElement;
  const toggleLiveInput = document.getElementById(
    "toggleLiveInput",
  ) as HTMLInputElement;
  const statusBadge = document.getElementById("statusBadge") as HTMLElement;

  // Tab controls
  const tabDomain = document.getElementById("tabDomain") as HTMLElement;
  const tabLangBadge = document.getElementById("tabLangBadge") as HTMLElement;
  const tabToggleBtn = document.getElementById(
    "tabToggleBtn",
  ) as HTMLButtonElement;
  const siteAlwaysToggle = document.getElementById(
    "siteAlwaysToggle",
  ) as HTMLInputElement;
  const tabOverrideRow = document.getElementById(
    "tabOverrideRow",
  ) as HTMLElement;

  // Quick converter
  const popupInput = document.getElementById(
    "popupInput",
  ) as HTMLTextAreaElement;
  const popupOutput = document.getElementById(
    "popupOutput",
  ) as HTMLTextAreaElement;
  const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement;
  const copyLabel = document.getElementById("copyLabel") as HTMLElement;

  let currentTabId: number | null = null;
  let currentHostname = "";
  let isPageTransliterated = false;

  function updateGlobalBadge(isActive: boolean): void {
    if (isActive) {
      statusBadge.textContent = "Увімкнено";
      statusBadge.classList.remove("inactive");
      statusBadge.classList.add("active");
    } else {
      statusBadge.textContent = "Вимкнено";
      statusBadge.classList.remove("active");
      statusBadge.classList.add("inactive");
    }
  }

  function renderTabControls(status: PageStatusResponse): void {
    currentHostname = status.hostname;
    isPageTransliterated = status.isTransliterated;

    tabDomain.textContent = status.hostname || "Поточна сторінка";

    // Set badge text and style
    tabLangBadge.className = "tab-lang-badge";
    if (status.isTransliterated) {
      tabLangBadge.textContent = "🔤 Латинка активна";
      tabLangBadge.classList.add("lang-active");
    } else if (status.isUkrainian) {
      tabLangBadge.textContent = "🇺🇦 Українська сторінка";
      tabLangBadge.classList.add("lang-uk");
    } else {
      tabLangBadge.textContent = "🌐 Інша мова / Ручний режим";
      tabLangBadge.classList.add("lang-other");
    }

    // Toggle button label and style
    if (status.isTransliterated) {
      tabToggleBtn.textContent = "Відновити оригінал";
      tabToggleBtn.classList.add("btn-active");
      tabToggleBtn.disabled = false;
    } else {
      tabToggleBtn.textContent = "Транслітерувати";
      tabToggleBtn.classList.remove("btn-active");
      tabToggleBtn.disabled = false;
    }

    // Per-site override checkbox
    siteAlwaysToggle.checked = status.siteOverride === true;
    tabOverrideRow.style.display = "flex";
  }

  function renderSystemTab(label = "Системна вкладка"): void {
    tabDomain.textContent = label;
    tabLangBadge.textContent = "⚠️ Розширення недоступне";
    tabLangBadge.className = "tab-lang-badge lang-other";
    tabToggleBtn.disabled = true;
    tabToggleBtn.textContent = "Недоступно";
    tabToggleBtn.classList.remove("btn-active");
    tabOverrideRow.style.display = "none";
  }

  // 1. Load active tab and query its status
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id || !activeTab?.url) {
        renderSystemTab();
        return;
      }

      currentTabId = activeTab.id;

      try {
        const url = new URL(activeTab.url);
        if (!url.protocol.startsWith("http")) {
          renderSystemTab("Службова сторінка");
          return;
        }

        currentHostname = url.hostname.toLowerCase();
        tabDomain.textContent = currentHostname;

        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "GET_PAGE_STATUS" },
          (response?: PageStatusResponse) => {
            if (chrome.runtime.lastError || !response) {
              // Content script might not have injected yet or page is protected
              tabLangBadge.textContent = "🌐 Ручний режим";
              tabLangBadge.className = "tab-lang-badge lang-other";
              tabToggleBtn.textContent = "Транслітерувати";
              tabToggleBtn.disabled = false;
              tabOverrideRow.style.display = "flex";
              return;
            }

            renderTabControls(response);
          },
        );
      } catch {
        renderSystemTab();
      }
    });
  }

  // 2. Load global extension settings
  getStorage().get(
    {
      autoPageTransliterate: true,
      liveInputTransliterate: false,
    },
    (items) => {
      toggleAutoPage.checked = items.autoPageTransliterate;
      toggleLiveInput.checked = items.liveInputTransliterate;
      updateGlobalBadge(items.autoPageTransliterate);
    },
  );

  // 3. Tab manual toggle button click
  tabToggleBtn.addEventListener("click", () => {
    if (!currentTabId) return;

    chrome.tabs.sendMessage(
      currentTabId,
      { action: "TOGGLE_PAGE" },
      (response?: { isTransliterated: boolean }) => {
        if (response && response.isTransliterated !== undefined) {
          isPageTransliterated = response.isTransliterated;
        } else {
          isPageTransliterated = !isPageTransliterated;
        }

        if (isPageTransliterated) {
          tabToggleBtn.textContent = "Відновити оригінал";
          tabToggleBtn.classList.add("btn-active");
          tabLangBadge.textContent = "🔤 Латинка активна";
          tabLangBadge.className = "tab-lang-badge lang-active";
        } else {
          tabToggleBtn.textContent = "Транслітерувати";
          tabToggleBtn.classList.remove("btn-active");
          tabLangBadge.textContent = "🌐 Оригінальний текст";
          tabLangBadge.className = "tab-lang-badge lang-other";
        }
      },
    );
  });

  // 4. Per-site override toggle
  siteAlwaysToggle.addEventListener("change", () => {
    if (!currentTabId || !currentHostname) return;

    const isAlways = siteAlwaysToggle.checked;
    chrome.tabs.sendMessage(
      currentTabId,
      {
        action: "SET_SITE_OVERRIDE",
        override: isAlways ? true : undefined,
      },
      (response?: { isTransliterated: boolean }) => {
        if (response && response.isTransliterated !== undefined) {
          isPageTransliterated = response.isTransliterated;
          if (isPageTransliterated) {
            tabToggleBtn.textContent = "Відновити оригінал";
            tabToggleBtn.classList.add("btn-active");
            tabLangBadge.textContent = "🔤 Латинка активна";
            tabLangBadge.className = "tab-lang-badge lang-active";
          } else {
            tabToggleBtn.textContent = "Транслітерувати";
            tabToggleBtn.classList.remove("btn-active");
          }
        }
      },
    );
  });

  // 5. Global autoPageTransliterate switch
  toggleAutoPage.addEventListener("change", () => {
    const isChecked = toggleAutoPage.checked;
    getStorage().set({ autoPageTransliterate: isChecked }, () => {
      updateGlobalBadge(isChecked);
    });
  });

  // 6. Global liveInputTransliterate switch
  toggleLiveInput.addEventListener("change", () => {
    getStorage().set({ liveInputTransliterate: toggleLiveInput.checked });
  });

  // 7. Live quick transliterator in popup
  popupInput.addEventListener("input", () => {
    const text = popupInput.value;
    popupOutput.value = transliterateWithCase(text);
  });

  // 8. Copy button
  copyBtn.addEventListener("click", async () => {
    const textToCopy = popupOutput.value;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      copyLabel.textContent = "Скопійовано!";
      copyBtn.classList.add("copied");

      setTimeout(() => {
        copyLabel.textContent = "Копіювати";
        copyBtn.classList.remove("copied");
      }, 1500);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  });
});
