# UkrLat Browser Extension (Firefox, Chrome, Safari)

Кросбраузерне розширення для автоматичної та інтерактивної транслітерації українського кириличного тексту в латинку (**UkrLat**).

Працює у **Firefox**, **Google Chrome**, **Brave**, **Microsoft Edge** та **Apple Safari**.

---

## 🌟 Можливості

1. **⚡ Авто-транслітерація сторінок (читання)**:
   - Автоматично перетворює видимий український текст на веб-сторінках у латинку.
   - Відстежує динамічно завантажений контент через `MutationObserver` (нескінченна стрічка, SPA).
   - Ігнорує блоки коду (`<pre>`, `<code>`), стилі, скрипти та поля введення.
   - Миттєво відновлює оригінальний текст сторінки при вимкненні перемикача без перезавантаження сторінки.

2. **✍️ Транслітерація при введенні (live typing)**:
   - При увімкненні автоматично перетворює кириличний текст на латинку в реальному часі прямо під час набору в полях вводу (`<input>`, `<textarea>`).
   - Коригує позицію каретки (курсора).
   - Захищає конфіденційні поля (паролі, email).

3. **🖱️ Контекстне меню та гарячі клавіші**:
   - Права кнопка миші $\rightarrow$ **«Транслітерувати латинкою (UkrLat)»**.
   - Гаряча клавіша **`Alt+U`**: транслітерує виділений фрагмент тексту на сторінці або у поточному полі вводу.

4. **🚀 Спливаюче вікно (Popup)**:
   - Швидкий двосторонній перекладач тексту з кнопкою «Копіювати».
   - Перемикачі режимів роботи.
   - Посилання на веб-додаток: [https://web-production-a554818f.up.railway.app](https://web-production-a554818f.up.railway.app).

---

## 🛠️ Встановлення та збірка

Усі скрипти збірки працюють на **Bun**:

```sh
cd extension

# Встановлення залежностей
bun install

# Запуск тестів
bun test

# Перевірка типів TypeScript
bun run typecheck

# Повна збірка для всіх трьох браузерів (Firefox, Chrome, Safari)
bun run build
```

Після виконання `bun run build` у папці `extension/dist/` будуть створені:
- `dist/firefox/` та архів для завантаження в AMO: `dist/ukrlat-firefox.zip`
- `dist/chrome/` та архів для Chrome Web Store: `dist/ukrlat-chrome.zip`
- `dist/safari/` та згенерований проект Xcode: `dist/safari-xcode/UkrLat/`

Також доступна збірка окремих цілей:
```sh
bun run build:firefox
bun run build:chrome
bun run build:safari
```

---

## 🖥️ Тестування в браузері (Режим розробника)

### 1. Mozilla Firefox
1. Відкрийте Firefox і перейдіть за адресою `about:debugging#/runtime/this-firefox`.
2. Натисніть **«Load Temporary Add-on...»** (Завантажити тимчасовий додаток...).
3. Виберіть файл `extension/dist/firefox/manifest.json`.

### 2. Google Chrome / Brave / Edge
1. Відкрийте `chrome://extensions` (або `edge://extensions`).
2. Увімкніть перемикач **«Developer mode»** (Режим розробника) у правому верхньому кутку.
3. Натисніть **«Load unpacked»** (Завантажити розпаковане розширення).
4. Оберіть папку `extension/dist/chrome`.

### 3. Apple Safari (macOS)
1. У Safari відкрийте **Settings $\rightarrow$ Advanced** та увімкніть **«Show Develop menu in menu bar»**.
2. У меню Safari: **Develop $\rightarrow$ Allow Unsigned Extensions** (Дозволити непідписані розширення).
3. Відкрийте згенерований Xcode-проєкт:
   ```sh
   open extension/dist/safari-xcode/UkrLat/UkrLat.xcodeproj
   ```
4. У Xcode натисніть кнопку **Run** (`Cmd + R`).
5. У Safari перейдіть у **Settings $\rightarrow$ Extensions** та позначте прапорець біля **UkrLat**.

---

## 📦 Публікація в офіційні магазини (Stores)

Детальний покроковий посібник із публікації в Mozilla Add-ons, Chrome Web Store та Apple App Store знаходиться у файлі:
👉 [`STORE_GUIDE.md`](./STORE_GUIDE.md)
