# Hexcrawl MVP

Минимальный веб-MVP для интерактивной hexcrawl-карты.

## Публикация

Приложение публикуется через GitHub Pages из workflow:

- URL опубликованной версии: <https://yuriyemelyanov.github.io/Hexcrawl/>
- Workflow: `.github/workflows/deploy.yml`
- Автопубликация происходит при пуше в ветку `main`.

> В репозитории нужно включить GitHub Pages: **Settings → Pages → Source: GitHub Actions**.

## Что реализовано

- Интерактивная гекс-карта в центре.
- Выбор гекса кликом.
- Панель слева с описанием выбранного гекса.
- Панель справа с простыми листами персонажей.
- Полностью локальный запуск (без backend, БД и авторизации).

## Стек

- React + TypeScript
- Vite

## Запуск локально

1. Установите зависимости:

```bash
npm install
```

2. Запустите dev-сервер:

```bash
npm run dev
```

3. Откройте в браузере адрес из консоли (обычно `http://localhost:5173`).

## Сборка production-версии

```bash
npm run build
npm run preview
```

## Команды для деплоя

```bash
npm run deploy
```

Скрипт `deploy` выполняет production-сборку для GitHub Pages.
