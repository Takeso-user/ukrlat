# ukrlat

## Опис

**ukrlat** — це веб-додаток та REST API для транслітерації українського тексту латиницею відповідно до правил української латинки. Проєкт працює на середовищі **Bun** та написаний на **TypeScript** з використанням Express.

## Можливості

- Транслітерація українського тексту в латинку з підтримкою пом'якшень (дь, ть, сь, ць, ль, нь, рь, зь) та буквосполучень
- Збереження регістра слів (у тому числі для слів у верхньому регістрі)
- Веб-інтерфейс для зручного введення та миттєвого отримання результату
- REST API для інтеграції з іншими застосунками
- Ендпоінт моніторингу працездатності `/health`

## Встановлення та запуск

1. Встановіть середовище [Bun](https://bun.sh) (якщо ще не встановлено):
   ```sh
   curl -fsSL https://bun.sh/install | bash
   ```

2. Створіть файл конфігурації `.env` на основі `.env.example`:
   ```sh
   cp .env.example .env
   ```

3. Встановіть залежності:
   ```sh
   bun install
   ```

4. Запустіть сервер:
   ```sh
   # Для розробки з автоперезапуском:
   bun dev

   # Або для звичайного запуску:
   bun start
   ```

5. Відкрийте браузер за адресою [http://localhost:3000](http://localhost:3000)

## Тестування, лінтинг та перевірка типів

- **Запуск тестів (Bun test runner)**:
  ```sh
  bun test           # Тести бекенду
  bun run test:all   # Тести бекенду та розширення
  ```
- **Перевірка типів TypeScript 7.0.2**:
  ```sh
  bun run typecheck
  ```
- **Лінтинг та форматування (Biome)**:
  ```sh
  bun run lint       # Перевірка стилю коду та правил лінтера
  bun run lint:fix   # Автоматичне виправлення помилок
  bun run format     # Форматування коду
  ```

## Автоматичне версіонування (SemVer) та публікація розширень

- **Оновлення версії (SemVer)** в усіх маніфестах, пакетах та Xcode:
  ```sh
  bun run version:patch   # Бамп patch-версії (1.0.0 -> 1.0.1)
  bun run version:minor   # Бамп minor-версії (1.0.0 -> 1.1.0)
  bun run version:major   # Бамп major-версії (1.0.0 -> 2.0.0)
  ```
- **Автоматична публікація через CLI в офіційні магазини**:
  ```sh
  bun run publish:firefox   # Відправка в Mozilla Add-ons (AMO) через web-ext
  bun run publish:chrome    # Відправка в Chrome Web Store API
  bun run publish:safari    # Збірка, архівування та відправка в App Store Connect через xcodebuild
  bun run publish:all       # Публікація в усі магазини одночасно
  ```

## Використання API

- **POST** `/api/v1/transliterate`
  - Тіло запиту (JSON): `{ "inputText": "Привіт, світе!" }`
  - Відповідь (JSON): `{ "outputText": "Pryvit, svite!" }`

- **GET** `/health`
  - Відповідь (JSON): `{ "status": "ok" }`

## Структура проєкту

- `src/`
  - [`index.ts`](file:///Users/sergiuszmalcew/projects/ukrlat/src/index.ts) — точка входу сервера
  - [`app.ts`](file:///Users/sergiuszmalcew/projects/ukrlat/src/app.ts) — налаштування Express-додатку, маршрутів та проміжного ПЗ
  - [`transliterate.ts`](file:///Users/sergiuszmalcew/projects/ukrlat/src/transliterate.ts) — логіка транслітерації української латинки з типами
- `tests/`
  - [`transliterate.test.ts`](file:///Users/sergiuszmalcew/projects/ukrlat/tests/transliterate.test.ts) — модульні тести для алгоритму транслітерації
  - [`api.test.ts`](file:///Users/sergiuszmalcew/projects/ukrlat/tests/api.test.ts) — інтеграційні тести API та статичних файлів
- `public/` — статичні файли фронтенду (`index.html`, `styles.css`, `script.js`)
- `extension/` — кросбраузерне розширення для **Firefox**, **Chrome** та **Safari** (авто-транслітерація сторінок та введення тексту, див. [`extension/README.md`](file:///Users/sergiuszmalcew/projects/ukrlat/extension/README.md))
- `.env.example` — зразок змінних середовища
- `tsconfig.json` — конфігурація компілятора TypeScript для Bun

## Розгортання (Deployment)

Додаток розгорнуто на безкоштовному акаунті Railway:
- **Live URL:** [https://web-production-a554818f.up.railway.app](https://web-production-a554818f.up.railway.app)

## Ліцензія

Проєкт розповсюджується під ліцензією Apache-2.0.
