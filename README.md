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

## Тестування та перевірка типів

- Запуск тестів (Bun test runner):
  ```sh
  bun test
  ```
- Перевірка типів TypeScript:
  ```sh
  bun run typecheck
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
