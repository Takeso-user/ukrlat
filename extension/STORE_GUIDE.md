# Посібник із публікації розширення UkrLat у магазини розширень

Цей документ містить покрокові інструкції щодо публікації розширення **UkrLat** в офіційних магазинах:
- **Mozilla Add-ons (Firefox AMO)**
- **Chrome Web Store (Google Chrome, Brave, Opera, Edge)**
- **Apple Safari (Mac App Store & iOS App Store)**

---

## ⚡ Автоматизована публікація через CLI (Оновлено)

В основному `package.json` налаштовано автоматичне версіонування за стандартом SemVer та команди для прямого завантаження в магазини через API/CLI:

### 1. Автоматичне версіонування (SemVer)
Перед публікацією використовуйте одну з команд для автоматичного оновлення версії в усіх маніфестах (Firefox, Chrome), `package.json` та Xcode-проєкті Safari:
```sh
bun run version:patch   # наприклад, 1.0.0 -> 1.0.1
bun run version:minor   # наприклад, 1.0.0 -> 1.1.0
bun run version:major   # наприклад, 1.0.0 -> 2.0.0
```

### 2. Автоматичне завантаження в один клік:
```sh
# Опублікувати в конкретний магазин:
bun run publish:firefox   # Автоматична збірка, підпис та завантаження в AMO через web-ext
bun run publish:chrome    # Автоматична збірка та завантаження в Chrome Web Store API
bun run publish:safari    # Автоматична збірка, створення .xcarchive та відправка в App Store Connect через xcodebuild

# Опублікувати відразу в усі три магазини з автоматичним бампом версії:
bun run publish:all --bump=patch
```

---

## 1. Mozilla Add-ons (Firefox AMO)

### Налаштування API (для CLI `bun run publish:firefox`)
1. Увійдіть на сторінку [Mozilla Add-on API Keys](https://addons.mozilla.org/developers/addon/api/key/).
2. Згенеруйте новий обліковий запис API (JWT issuer та secret).
3. Додайте ключі до свого файлу `.env`:
   ```env
   AMO_JWT_ISSUER=user:12345678:999
   AMO_JWT_SECRET=your_mozilla_api_secret_key
   AMO_CHANNEL=listed
   ```
4. Запустіть:
   ```sh
   bun run publish:firefox
   ```
   Команда автоматично збере розширення, згенерує `ukrlat-firefox.zip`, підпише його через офіційний `web-ext` та відправить на модерацію.

### Ручне завантаження (альтернатива)
- Готовий архів: `extension/dist/ukrlat-firefox.zip`
- На [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/) натисніть *«Submit a New Add-on»* та завантажте zip-файл.

---

## 2. Chrome Web Store (Chrome, Edge, Brave)

### Налаштування API (для CLI `bun run publish:chrome`)
1. Зареєструйтеся у [Chrome Web Store Developer Dashboard](https://chromewebstore.google.com/developer) (одноразова реєстрація $5 USD).
2. Створіть Google Cloud Project та налаштуйте Chrome Web Store API згідно з [офіційною інструкцією](https://github.com/fregante/chrome-webstore-upload/blob/main/How%20to%20generate%20Google%20API%20keys.md).
3. Додайте змінні до файлу `.env`:
   ```env
   CHROME_EXTENSION_ID=abcdefghijklmnopqrstuvwxyz123456
   CHROME_CLIENT_ID=your_client_id.apps.googleusercontent.com
   CHROME_CLIENT_SECRET=your_client_secret
   CHROME_REFRESH_TOKEN=your_refresh_token
   ```
4. Запустіть:
   ```sh
   bun run publish:chrome
   ```
   Скрипт автоматично завантажить нову версію та відправить її на рев'ю з прапорцем `--auto-publish`.

### Ручне завантаження (альтернатива)
- Готовий архів: `extension/dist/ukrlat-chrome.zip`
- Завантажте архів у консолі Chrome Web Store, вкажіть опис, додайте скріншот і надішліть на перевірку.

---

## 3. Apple Safari (Mac App Store & iOS App Store)

### Налаштування CLI (для `bun run publish:safari`)
Оскільки обліковий запис розробника Apple вже додано в Xcode на вашому Mac:
1. Запустіть CLI-команду:
   ```sh
   bun run publish:safari
   ```
2. Скрипт автоматично:
   - Збирає бандл розширення Safari.
   - Генерує нативний проєкт Xcode у `extension/dist/safari-xcode/UkrLat`.
   - Запускає `xcodebuild archive` із параметром `-allowProvisioningUpdates` та вашим встановленим сертифікатом.
   - Виконує `xcodebuild -exportArchive` з `scripts/exportOptions.plist` та надсилає архів напряму в App Store Connect.

### Ручне відкриття в Xcode (якщо потрібно змінити налаштування інтерфейсу)
```sh
open extension/dist/safari-xcode/UkrLat/UkrLat.xcodeproj
```
У вікні Xcode оберіть команду розробника (Team) у вкладці *Signing & Capabilities*, після чого натисніть *Product $\rightarrow$ Archive* $\rightarrow$ *Distribute App*.
