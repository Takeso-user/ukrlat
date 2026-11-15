# Посібник із публікації розширення UkrLat у магазини розширень

Цей документ містить покрокові інструкції щодо публікації розширення **UkrLat** в офіційних магазинах:
- **Mozilla Add-ons (Firefox AMO)**
- **Chrome Web Store (Google Chrome, Brave, Opera, Edge)**
- **Apple Safari (Mac App Store & iOS App Store)**

---

## 1. Mozilla Add-ons (Firefox AMO)

### Підготовка файлу
- Готовий архів: `extension/dist/ukrlat-firefox.zip`
- Маніфест містить `browser_specific_settings.gecko.id: "ukrlat@takeso.com"` та версію Manifest V3.

### Кроки для публікації:
1. Зареєструйтеся або увійдіть на [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Натисніть кнопку **«Submit a New Add-on»** (Подати новий додаток).
3. Оберіть варіант розповсюдження:
   - **«On this site»** (На цьому сайті) — рекомендовано для публічного розміщення в каталозі Firefox Add-ons.
4. Завантажте архів `extension/dist/ukrlat-firefox.zip`.
5. Автоматичний валідатор перевірить маніфест і код (розширення повністю відповідає стандарту MV3).
6. Якщо модератори запитають вихідний код (source code review):
   - Оскільки код транспілюється з TypeScript за допомогою Bun, створіть архів вихідних файлів папки `extension/src` та надішліть його з інструкцією збірки:
     ```sh
     cd extension
     bun install
     bun run build:firefox
     ```
7. Заповніть інформацію для сторінки додатку:
   - **Назва:** UkrLat - Українська латинка
   - **Короткий опис:** Автоматична та інтерактивна транслітерація українського кириличного тексту в латинку.
   - **Категорія:** Мовні інструменти / Продуктивність.
8. Натисніть **«Submit Version»**. Модерація зазвичай займає від кількох годин до 1-2 днів.

---

## 2. Chrome Web Store (Chrome, Edge, Brave)

### Підготовка файлу
- Готовий архів: `extension/dist/ukrlat-chrome.zip`

### Кроки для публікації:
1. Перейдіть до [Chrome Web Store Developer Dashboard](https://chromewebstore.google.com/developer).
2. Зареєструйте обліковий запис розробника Google (одноразова реєстраційна плата становить $5 USD).
3. Натисніть **«Add new item»** (Додати новий елемент).
4. Завантажте архів `extension/dist/ukrlat-chrome.zip`.
5. Заповніть інформацію про розширення:
   - **Детальний опис:** Опишіть можливості (авто-транслітерація сторінок, швидкий перекладач, підміна тексту при введенні, гаряча клавіша `Alt+U`).
   - **Скріншоти:** Завантажте щонайменше 1 скріншот (1280x800 або 640x400 px), наприклад, спливаюче вікно та приклад транслітерованого тексту.
   - **Значок:** Використовуйте `extension/src/icons/icon128.png`.
   - **Категорія:** Tools (Інструменти) або Accessibility (Спеціальні можливості).
6. Вкладка **Privacy (Конфіденційність)**:
   - **Single Purpose (Єдина мета):** Автоматична та інтерактивна транслітерація українського тексту в латинку.
   - **Обґрунтування дозволів (Permission justification):**
     - `storage`: збереження налаштувань користувача (перемикачі авто-транслітерації та вводу).
     - `activeTab`: доступ до поточної сторінки для застосування транслітерації тексту.
     - `contextMenus`: створення пункту правої кнопки миші для транслітерації виділеного тексту.
   - **Збір даних:** Позначте «Ні» — розширення не збирає та не передає жодних персональних даних (уся транслітерація відбувається локально в браузері).
7. Натисніть **«Submit for Review»** (Подати на розгляд). Перевірка зазвичай займає 1-3 робочих дні.

---

## 3. Apple Safari (Mac App Store & iOS App Store)

Для Safari розширення упаковуються як нативні macOS / iOS додатки за допомогою Xcode.

### Підготовка:
- Проєкт Xcode вже згенеровано у папці:
  ```
  extension/dist/safari-xcode/UkrLat/UkrLat.xcodeproj
  ```

### Кроки для публікації:
1. **Обліковий запис Apple Developer:**
   - Необхідна активна підписка [Apple Developer Program](https://developer.apple.com/programs/) ($99/рік).
2. **Відкрийте проєкт у Xcode:**
   ```sh
   open extension/dist/safari-xcode/UkrLat/UkrLat.xcodeproj
   ```
3. **Налаштування підпису (Signing):**
   - У панелі навігації Xcode виберіть кореневий проєкт **UkrLat**.
   - Перейдіть на вкладку **Signing & Capabilities**.
   - Оберіть вашу команду розробника (**Team**) для обох цілей:
     - `UkrLat (macOS App)`
     - `UkrLat Extension (macOS Extension)`
   - Переконайтеся, що `Bundle Identifier` відповідає зареєстрованому у вашому Apple Developer акаунті (за замовчуванням `com.takeso.ukrlat`).
4. **Створення запису в App Store Connect:**
   - Перейдіть на [App Store Connect](https://appstoreconnect.apple.com/).
   - Створіть новий додаток (New App), обравши платформу **macOS** (та iOS за бажанням).
5. **Архівація та відправка (Archive & Upload):**
   - У Xcode оберіть схему **UkrLat (macOS)** та пристрій **Any Mac (Apple Silicon, Intel)**.
   - У верхньому меню оберіть **Product $\rightarrow$ Archive**.
   - Після завершення збірки у вікні Organizer натисніть **Distribute App $\rightarrow$ App Store Connect**.
   - Дотримуйтесь підказок для автоматичного завантаження збірки в App Store Connect.
6. **Подання на рев'ю:**
   - В App Store Connect додайте скріншоти, опис, посилання на політику конфіденційності та виберіть завантажену збірку.
   - Натисніть **«Submit for Review»**. Модерація Apple займає близько 24–48 годин.

---

## 📋 Контрольний список перед відправкою (Pre-flight Checklist)

- [x] Код зібрано та оптимізовано за допомогою `bun run build`.
- [x] Модульні тести пройдено (`bun test`).
- [x] Перевірку типів TypeScript пройдено (`bun run typecheck`).
- [x] Іконки всіх розмірів (16x16, 48x48, 128x128) присутні в архівах.
- [x] Локалізація налаштована (`_locales/uk` та `_locales/en`).
- [x] Усі архіви для Firefox (`ukrlat-firefox.zip`) та Chrome (`ukrlat-chrome.zip`) сформовані.
- [x] Xcode-проєкт для Safari сформований (`dist/safari-xcode/UkrLat`).
