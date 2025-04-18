# ukrlat

## Опис

**ukrlat** — це веб-додаток для транслітерації українського тексту латиницею відповідно до правил української латинки. Проєкт складається з фронтенду (інтерфейс користувача) та бекенду (сервер на Node.js з Express).

## Можливості

- Транслітерація українського тексту в латиницю
- Підтримка великих і малих літер
- Веб-інтерфейс для зручного введення та отримання результату
- REST API для інтеграції з іншими застосунками

## Встановлення та запуск

1. Встановіть залежності:
   ```sh
   npm install
   ```
2. Запустіть сервер:
   ```sh
   npm start
   ```
3. Відкрийте браузер і перейдіть за адресою [http://localhost:3000](http://localhost:3000)

## Використання API

- **POST** `/api/v1/transliterate`
  - Тіло запиту (JSON): `{ "inputText": "текст українською" }`
  - Відповідь (JSON): `{ "outputText": "transliterovanyj tekst" }`

## Структура проєкту

- `index.js` — основний серверний файл (Express)
- `transliterate.js` — функція транслітерації
- `public/` — статичні файли фронтенду (HTML, CSS, JS)
- `transliterate.test.js` — тести для функції транслітерації

## Ліцензія

Проєкт розповсюджується під ліцензією Apache-2.0.
