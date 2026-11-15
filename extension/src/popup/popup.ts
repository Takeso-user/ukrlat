import { transliterateWithCase } from "../transliterate";

function getStorage(): chrome.storage.StorageArea {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    return chrome.storage.sync;
  }
  return chrome.storage.local;
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleAutoPage = document.getElementById(
    "toggleAutoPage",
  ) as HTMLInputElement;
  const toggleLiveInput = document.getElementById(
    "toggleLiveInput",
  ) as HTMLInputElement;
  const statusBadge = document.getElementById("statusBadge") as HTMLElement;
  const popupInput = document.getElementById(
    "popupInput",
  ) as HTMLTextAreaElement;
  const popupOutput = document.getElementById(
    "popupOutput",
  ) as HTMLTextAreaElement;
  const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement;
  const copyLabel = document.getElementById("copyLabel") as HTMLElement;

  function updateStatus(isActive: boolean): void {
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

  // Load existing settings
  getStorage().get(
    {
      autoPageTransliterate: true,
      liveInputTransliterate: false,
    },
    (items) => {
      toggleAutoPage.checked = items.autoPageTransliterate;
      toggleLiveInput.checked = items.liveInputTransliterate;
      updateStatus(items.autoPageTransliterate);
    },
  );

  // Toggle page transliteration
  toggleAutoPage.addEventListener("change", () => {
    const isChecked = toggleAutoPage.checked;
    getStorage().set({ autoPageTransliterate: isChecked }, () => {
      updateStatus(isChecked);
    });
  });

  // Toggle input field transliteration
  toggleLiveInput.addEventListener("change", () => {
    getStorage().set({ liveInputTransliterate: toggleLiveInput.checked });
  });

  // Live quick transliterator in popup
  popupInput.addEventListener("input", () => {
    const text = popupInput.value;
    popupOutput.value = transliterateWithCase(text);
  });

  // Copy button
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
