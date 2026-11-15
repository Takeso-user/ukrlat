// UkrLat — Client-Side Engine & Interactive Frontend

// Complete transliteration map (matching src/transliterate.ts)
const translitMap = {
  а: "a", А: "A",
  б: "b", Б: "B",
  в: "v", В: "V",
  г: "g", Г: "G",
  ґ: "ĝ", Ґ: "Ĝ",
  д: "d", Д: "D",
  дь: "ď", ДЬ: "Ď", Дь: "Ď",
  е: "e", Е: "E",
  є: "ê", Є: "Ê",
  ж: "ž", Ж: "Ž",
  з: "z", З: "Z",
  зь: "ź", ЗЬ: "Ź", Зь: "Ź",
  и: "y", И: "Y",
  і: "i", І: "I",
  ї: "î", Ї: "Î",
  й: "j", Й: "J",
  к: "k", К: "K",
  л: "l", Л: "L",
  ль: "ĺ", ЛЬ: "Ĺ", Ль: "Ĺ",
  м: "m", М: "M",
  н: "n", Н: "N",
  нь: "ń", НЬ: "Ń", Нь: "Ń",
  о: "o", О: "O",
  п: "p", П: "P",
  р: "r", Р: "R",
  с: "s", С: "S",
  сь: "ś", СЬ: "Ś", Сь: "Ś",
  т: "t", Т: "T",
  ть: "ť", ТЬ: "Ť", Ть: "Ť",
  у: "u", У: "U",
  ф: "f", Ф: "F",
  х: "h", Х: "H",
  ц: "c", Ц: "C",
  ць: "ć", ЦЬ: "Ć", Ць: "Ć",
  ч: "č", Ч: "Č",
  ш: "š", Ш: "Š",
  щ: "šč", Щ: "Šč",
  ю: "û", Ю: "Û",
  я: "â", Я: "Â",
  "’": "'", "'": "'", "`": "'"
};

// Client-side instant transliterate function
function localTransliterate(text) {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const currentChar = text[i];
    const nextChar = i < text.length - 1 ? text[i + 1] : "";
    const pair = currentChar + nextChar;

    if (translitMap[pair] !== undefined) {
      result += translitMap[pair];
      i++;
    } else {
      result += translitMap[currentChar] !== undefined ? translitMap[currentChar] : currentChar;
    }
  }
  return result;
}

function transliterateWithCaseLocal(text) {
  if (!text) return "";
  const words = text.split(" ");
  return words.map(word => {
    const isAllUpper = word.length > 0 && word === word.toUpperCase() && /[А-ЯІЇЄҐ]/.test(word);
    let trans = localTransliterate(word);
    if (isAllUpper) {
      trans = trans.toUpperCase();
    }
    return trans;
  }).join(" ");
}

// Function called by tests or explicit button click
function transliterateText() {
  const inputEl = document.getElementById("inputText");
  const outputEl = document.getElementById("outputText");
  if (!inputEl || !outputEl) return;

  const inputText = inputEl.value;

  // Perform instant local transliteration
  outputEl.value = transliterateWithCaseLocal(inputText);
  updateCounts();

  // Also query API to ensure server consistency
  fetch("/api/v1/transliterate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputText: inputText })
  })
    .then(res => res.json())
    .then(data => {
      if (data && data.outputText !== undefined) {
        outputEl.value = data.outputText;
      }
    })
    .catch(err => {
      // Local result already displayed, fail silently
      console.debug("API call completed with local fallback", err);
    });
}

function updateCounts() {
  const inputEl = document.getElementById("inputText");
  const outputEl = document.getElementById("outputText");
  const inputCounts = document.getElementById("inputCounts");
  const outputCounts = document.getElementById("outputCounts");

  if (inputEl && inputCounts) {
    const text = inputEl.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    inputCounts.textContent = `${chars} симв. • ${words} слів`;
  }

  if (outputEl && outputCounts) {
    const text = outputEl.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    outputCounts.textContent = `${chars} симв. • ${words} слів`;
  }
}

function showToast(msg = "Скопійовано в буфер обміну!") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.querySelector(".toast-msg").textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function copyOutput() {
  const outputEl = document.getElementById("outputText");
  if (!outputEl || !outputEl.value) return;

  navigator.clipboard.writeText(outputEl.value).then(() => {
    showToast();
  }).catch(() => {
    outputEl.select();
    document.execCommand("copy");
    showToast();
  });
}

function clearAll() {
  const inputEl = document.getElementById("inputText");
  const outputEl = document.getElementById("outputText");
  if (inputEl) inputEl.value = "";
  if (outputEl) outputEl.value = "";
  updateCounts();
}

function insertSample(type) {
  const inputEl = document.getElementById("inputText");
  if (!inputEl) return;

  if (type === "shevchenko") {
    inputEl.value = `Реве та стогне Дніпр широкий,
Сердитий вітер завива,
Додолу верби гне високі,
Горами хвилю підійма.

Ще треті півні не співали,
Ніхто ніде не гомонів,
Сичі в гаю перекликались,
Та ясен раз у раз скрипів.`;
  } else if (type === "franko") {
    inputEl.value = `Книги — морська глибина:
Хто в них пірне аж до дна,
Той, хоч і труду мав досить,
Дивнії перли виносить.`;
  } else if (type === "phrases") {
    inputEl.value = `Доброго дня! Як ваші справи?
Вітаємо у світі сучасної української латинки.
Київ — серце вільної та незалежної України.
Дякую за підтримку нашого проекту!`;
  }

  transliterateText();
}

function downloadResult() {
  const outputEl = document.getElementById("outputText");
  if (!outputEl || !outputEl.value) return;

  const blob = new Blob([outputEl.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ukrlat-translit.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Interactive API test helper
function testLiveApi() {
  const testInput = document.getElementById("apiTestInput");
  const testOutput = document.getElementById("apiTestOutput");
  if (!testInput || !testOutput) return;

  testOutput.textContent = "Надсилання запиту до /api/v1/transliterate...";

  fetch("/api/v1/transliterate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputText: testInput.value })
  })
    .then(res => res.json())
    .then(data => {
      testOutput.textContent = JSON.stringify(data, null, 2);
    })
    .catch(err => {
      testOutput.textContent = "Помилка запиту: " + err.message;
    });
}

// Initial setup on page load
document.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("inputText");
  if (inputEl) {
    // Instant live typing transliteration
    inputEl.addEventListener("input", () => {
      transliterateText();
    });

    // Keyboard shortcut: Ctrl+Enter or Cmd+Enter
    inputEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        transliterateText();
      }
    });

    // Initialize with a default beautiful sample if empty
    if (!inputEl.value.trim()) {
      insertSample("shevchenko");
    } else {
      transliterateText();
    }
  }
});
