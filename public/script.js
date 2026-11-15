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

// ==========================================
// Latin Alphabet Datasets & Interactive Tabs
// ==========================================

// Standard Latin alphabetical order (A to Z) with diacritics directly following their base letter
const latinAlphabetData = [
  { idx: 1, lat: "A a", cyr: "А", sound: "[a]", wordLat: "avto", wordCyr: "авто", cat: "vowels" },
  { idx: 2, lat: "Â â", cyr: "Я", sound: "[ja] / [ʲa]", wordLat: "âbluko", wordCyr: "яблуко", cat: "vowels-iot" },
  { idx: 3, lat: "B b", cyr: "Б", sound: "[b]", wordLat: "brat", wordCyr: "брат", cat: "consonants" },
  { idx: 4, lat: "C c", cyr: "Ц", sound: "[ts]", wordLat: "cukor", wordCyr: "цукор", cat: "sibilants" },
  { idx: 5, lat: "Ć ć", cyr: "ЦЬ", sound: "[tsʲ]", wordLat: "paleć", wordCyr: "палець", cat: "soft" },
  { idx: 6, lat: "Č č", cyr: "Ч", sound: "[tʃ]", wordLat: "čas", wordCyr: "час", cat: "sibilants" },
  { idx: 7, lat: "D d", cyr: "Д", sound: "[d]", wordLat: "dim", wordCyr: "дім", cat: "consonants" },
  { idx: 8, lat: "Ď ď", cyr: "ДЬ", sound: "[dʲ]", wordLat: "dâďko", wordCyr: "дядько", cat: "soft" },
  { idx: 9, lat: "E e", cyr: "Е", sound: "[e]", wordLat: "ekran", wordCyr: "екран", cat: "vowels" },
  { idx: 10, lat: "Ê ê", cyr: "Є", sound: "[je] / [ʲe]", wordLat: "êdnisť", wordCyr: "єдність", cat: "vowels-iot" },
  { idx: 11, lat: "F f", cyr: "Ф", sound: "[f]", wordLat: "farba", wordCyr: "фарба", cat: "consonants" },
  { idx: 12, lat: "G g", cyr: "Г", sound: "[ɦ]", wordLat: "gora", wordCyr: "гора", cat: "consonants" },
  { idx: 13, lat: "Ĝ ĝ", cyr: "Ґ", sound: "[ɡ]", wordLat: "ĝanok", wordCyr: "ґанок", cat: "sibilants" },
  { idx: 14, lat: "H h", cyr: "Х", sound: "[x]", wordLat: "hlib", wordCyr: "хліб", cat: "consonants" },
  { idx: 15, lat: "I i", cyr: "І", sound: "[i]", wordLat: "iskra", wordCyr: "іскра", cat: "vowels" },
  { idx: 16, lat: "Î î", cyr: "Ї", sound: "[ji]", wordLat: "îžak", wordCyr: "їжак", cat: "vowels-iot" },
  { idx: 17, lat: "J j", cyr: "Й", sound: "[j]", wordLat: "jod", wordCyr: "йод", cat: "consonants" },
  { idx: 18, lat: "K k", cyr: "К", sound: "[k]", wordLat: "knyga", wordCyr: "книга", cat: "consonants" },
  { idx: 19, lat: "L l", cyr: "Л", sound: "[l]", wordLat: "lampa", wordCyr: "лампа", cat: "consonants" },
  { idx: 20, lat: "Ĺ ĺ", cyr: "ЛЬ", sound: "[lʲ]", wordLat: "siĺ", wordCyr: "сіль", cat: "soft" },
  { idx: 21, lat: "M m", cyr: "М", sound: "[m]", wordLat: "misto", wordCyr: "місто", cat: "consonants" },
  { idx: 22, lat: "N n", cyr: "Н", sound: "[n]", wordLat: "nebo", wordCyr: "небо", cat: "consonants" },
  { idx: 23, lat: "Ń ń", cyr: "НЬ", sound: "[nʲ]", wordLat: "kiń", wordCyr: "кінь", cat: "soft" },
  { idx: 24, lat: "O o", cyr: "О", sound: "[o]", wordLat: "oko", wordCyr: "око", cat: "vowels" },
  { idx: 25, lat: "P p", cyr: "П", sound: "[p]", wordLat: "pole", wordCyr: "поле", cat: "consonants" },
  { idx: 26, lat: "R r", cyr: "Р", sound: "[r]", wordLat: "ruka", wordCyr: "рука", cat: "consonants" },
  { idx: 27, lat: "Ŕ ŕ", cyr: "РЬ", sound: "[rʲ]", wordLat: "caŕ", wordCyr: "царь", cat: "soft" },
  { idx: 28, lat: "S s", cyr: "С", sound: "[s]", wordLat: "sonce", wordCyr: "сонце", cat: "consonants" },
  { idx: 29, lat: "Ś ś", cyr: "СЬ", sound: "[sʲ]", wordLat: "śogodni", wordCyr: "сьогодні", cat: "soft" },
  { idx: 30, lat: "Š š", cyr: "Ш", sound: "[ʃ]", wordLat: "šlâh", wordCyr: "шлях", cat: "sibilants" },
  { idx: 31, lat: "Šč šč", cyr: "Щ", sound: "[ʃtʃ]", wordLat: "ščastâ", wordCyr: "щастя", cat: "sibilants" },
  { idx: 32, lat: "T t", cyr: "Т", sound: "[t]", wordLat: "trava", wordCyr: "трава", cat: "consonants" },
  { idx: 33, lat: "Ť ť", cyr: "ТЬ", sound: "[tʲ]", wordLat: "baťko", wordCyr: "батько", cat: "soft" },
  { idx: 34, lat: "U u", cyr: "У", sound: "[u]", wordLat: "urok", wordCyr: "урок", cat: "vowels" },
  { idx: 35, lat: "Û û", cyr: "Ю", sound: "[ju] / [ʲu]", wordLat: "ûnak", wordCyr: "юнак", cat: "vowels-iot" },
  { idx: 36, lat: "V v", cyr: "В", sound: "[v]", wordLat: "voda", wordCyr: "вода", cat: "consonants" },
  { idx: 37, lat: "Y y", cyr: "И", sound: "[ɪ]", wordLat: "ryba", wordCyr: "риба", cat: "vowels" },
  { idx: 38, lat: "Z z", cyr: "З", sound: "[z]", wordLat: "zemlâ", wordCyr: "земля", cat: "consonants" },
  { idx: 39, lat: "Ź ź", cyr: "ЗЬ", sound: "[zʲ]", wordLat: "blyźko", wordCyr: "близько", cat: "soft" },
  { idx: 40, lat: "Ž ž", cyr: "Ж", sound: "[ʒ]", wordLat: "žyttâ", wordCyr: "життя", cat: "sibilants" }
];

const cyrillicAlphabetData = [
  { cyr: "А а", lat: "A a" },
  { cyr: "Б б", lat: "B b" },
  { cyr: "В в", lat: "V v" },
  { cyr: "Г г", lat: "G g" },
  { cyr: "Ґ ґ", lat: "Ĝ ĝ" },
  { cyr: "Д д", lat: "D d" },
  { cyr: "Дь дь", lat: "Ď ď" },
  { cyr: "Е е", lat: "E e" },
  { cyr: "Є є", lat: "Ê ê" },
  { cyr: "Ж ж", lat: "Ž ž" },
  { cyr: "З з", lat: "Z z" },
  { cyr: "Зь зь", lat: "Ź ź" },
  { cyr: "И и", lat: "Y y" },
  { cyr: "І і", lat: "I i" },
  { cyr: "Ї ї", lat: "Î î" },
  { cyr: "Й й", lat: "J j" },
  { cyr: "К к", lat: "K k" },
  { cyr: "Л л", lat: "L l" },
  { cyr: "Ль ль", lat: "Ĺ ĺ" },
  { cyr: "М м", lat: "M m" },
  { cyr: "Н н", lat: "N n" },
  { cyr: "Нь нь", lat: "Ń ń" },
  { cyr: "О о", lat: "O o" },
  { cyr: "П п", lat: "P p" },
  { cyr: "Р р", lat: "R r" },
  { cyr: "Рь рь", lat: "Ŕ ŕ" },
  { cyr: "С с", lat: "S s" },
  { cyr: "Сь сь", lat: "Ś ś" },
  { cyr: "Т т", lat: "T t" },
  { cyr: "Ть ть", lat: "Ť ť" },
  { cyr: "У у", lat: "U u" },
  { cyr: "Ф ф", lat: "F f" },
  { cyr: "Х х", lat: "H h" },
  { cyr: "Ц ц", lat: "C c" },
  { cyr: "Ць ць", lat: "Ć ć" },
  { cyr: "Ч ч", lat: "Č č" },
  { cyr: "Ш ш", lat: "Š š" },
  { cyr: "Щ щ", lat: "Šč šč" },
  { cyr: "Ю ю", lat: "Û û" },
  { cyr: "Я я", lat: "Â â" }
];

let currentAlphabetTab = "latin";

function selectLetterWord(wordCyr) {
  const inputEl = document.getElementById("inputText");
  if (!inputEl) return;
  inputEl.value = wordCyr;
  transliterateText();
  document.getElementById("converter").scrollIntoView({ behavior: "smooth" });
  showToast(`Вставлено слово: "${wordCyr}"`);
}

function renderLatinAlphabet(query = "") {
  const container = document.getElementById("alphabetContent");
  if (!container) return;

  const q = query.trim().toLowerCase();
  const filtered = latinAlphabetData.filter(item => {
    if (!q) return true;
    return (
      item.lat.toLowerCase().includes(q) ||
      item.cyr.toLowerCase().includes(q) ||
      item.wordLat.toLowerCase().includes(q) ||
      item.wordCyr.toLowerCase().includes(q) ||
      item.sound.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 32px;">Нічого не знайдено за запитом "${query}"</div>`;
    return;
  }

  let html = `<div class="lat-alphabet-grid">`;
  filtered.forEach(item => {
    html += `
      <div class="lat-card" onclick="selectLetterWord('${item.wordCyr}')" title="Клікніть, щоб випробувати слово '${item.wordCyr}'">
        <div class="lat-card-top">
          <span class="lat-letter">${item.lat}</span>
          <span class="lat-idx">#${item.idx}</span>
        </div>
        <div class="lat-meta-row">
          <span class="lat-cyr-badge">Кирилиця: ${item.cyr}</span>
          <span class="lat-sound">${item.sound}</span>
        </div>
        <div class="lat-example">
          Приклад: <strong>${item.wordLat}</strong> <em>(${item.wordCyr})</em>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderCyrillicAlphabet(query = "") {
  const container = document.getElementById("alphabetContent");
  if (!container) return;

  const q = query.trim().toLowerCase();
  const filtered = cyrillicAlphabetData.filter(item => {
    if (!q) return true;
    return item.cyr.toLowerCase().includes(q) || item.lat.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 32px;">Нічого не знайдено за запитом "${query}"</div>`;
    return;
  }

  let html = `<div class="alphabet-grid">`;
  filtered.forEach(item => {
    html += `
      <div class="letter-pair" onclick="selectLetterWord('${item.cyr.split(' ')[0]}')" title="Клікніть, щоб вставити літеру">
        <span class="cyr-char">${item.cyr}</span>
        <span class="lat-char">${item.lat}</span>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderCategoriesAlphabet(query = "") {
  const container = document.getElementById("alphabetContent");
  if (!container) return;

  const categories = [
    { id: "vowels", title: "Голосні звуки (Vowels)", desc: "Основні голосні звуки української мови" },
    { id: "vowels-iot", title: "Йотовані голосні (Iotated Vowels)", desc: "Позначають сполучення [j] з голосним або пом'якшення попереднього приголосного" },
    { id: "consonants", title: "Базові приголосні (Basic Consonants)", desc: "Стандартні приголосні звуки латинської графіки" },
    { id: "sibilants", title: "Шиплячі, африкати та проривний [ґ] (Sibilants & Affricates)", desc: "Звуки з гачеками та циркумфлексом (č, š, ž, šč, c, ĝ)" },
    { id: "soft", title: "Пом'якшені приголосні (Palatalized / Soft)", desc: "Приголосні звуки з м'яким знаком, передані акутом/гачеком (ć, ď, ĺ, ń, ŕ, ś, ť, ź)" }
  ];

  const q = query.trim().toLowerCase();
  let html = "";

  categories.forEach(cat => {
    const items = latinAlphabetData.filter(item => {
      const matchCat = item.cat === cat.id;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.lat.toLowerCase().includes(q) ||
        item.cyr.toLowerCase().includes(q) ||
        item.wordLat.toLowerCase().includes(q) ||
        item.wordCyr.toLowerCase().includes(q)
      );
    });

    if (items.length > 0) {
      html += `
        <div class="category-group">
          <div class="category-title">
            <span>● ${cat.title}</span>
            <span class="count">${items.length} літер</span>
          </div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">${cat.desc}</div>
          <div class="lat-alphabet-grid">
      `;
      items.forEach(item => {
        html += `
          <div class="lat-card" onclick="selectLetterWord('${item.wordCyr}')" title="Клікніть, щоб випробувати слово '${item.wordCyr}'">
            <div class="lat-card-top">
              <span class="lat-letter">${item.lat}</span>
              <span class="lat-idx">#${item.idx}</span>
            </div>
            <div class="lat-meta-row">
              <span class="lat-cyr-badge">Кирилиця: ${item.cyr}</span>
              <span class="lat-sound">${item.sound}</span>
            </div>
            <div class="lat-example">
              Приклад: <strong>${item.wordLat}</strong> <em>(${item.wordCyr})</em>
            </div>
          </div>
        `;
      });
      html += `</div></div>`;
    }
  });

  if (!html) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 32px;">Нічого не знайдено за запитом "${query}"</div>`;
  } else {
    container.innerHTML = html;
  }
}

function switchAlphabetTab(tab) {
  currentAlphabetTab = tab;
  const buttons = document.querySelectorAll(".alphabet-tabs .tab-btn");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  const searchInput = document.getElementById("alphabetSearchInput");
  const query = searchInput ? searchInput.value : "";

  if (tab === "latin") {
    renderLatinAlphabet(query);
  } else if (tab === "cyrillic") {
    renderCyrillicAlphabet(query);
  } else if (tab === "categories") {
    renderCategoriesAlphabet(query);
  }
}

function filterAlphabet() {
  const searchInput = document.getElementById("alphabetSearchInput");
  const query = searchInput ? searchInput.value : "";
  if (currentAlphabetTab === "latin") {
    renderLatinAlphabet(query);
  } else if (currentAlphabetTab === "cyrillic") {
    renderCyrillicAlphabet(query);
  } else if (currentAlphabetTab === "categories") {
    renderCategoriesAlphabet(query);
  }
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

  // Initialize Latin alphabet tab
  switchAlphabetTab("latin");
});
