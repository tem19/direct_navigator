# direct_navigator

Десктопный офлайн-редактор рекламных кампаний Яндекс Директа (аналог
Директ.Коммандера). Electron + React 18 + TypeScript + better-sqlite3.
Целевая платформа — **macOS / Apple Silicon (arm64)**.

## Быстрый старт

```bash
npm install          # ставит зависимости; postinstall собирает better-sqlite3 под Electron
npm run dev          # запуск в режиме разработки (Vite + Electron)
```

Если после смены версии Electron better-sqlite3 не грузится (ошибка ABI):

```bash
npm run rebuild      # electron-rebuild для better-sqlite3
```

## Скрипты

| Скрипт | Назначение |
| --- | --- |
| `npm run dev` | Запуск приложения в dev-режиме |
| `npm run build` | Типизация + сборка main/preload/renderer (electron-vite) |
| `npm run dist` | Сборка dmg/zip под mac/arm64 (electron-builder) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Проверка типов (node + web проекты) |
| `npm run test` | Юнит-тесты (Vitest) |
| `npm run test:e2e` | E2E (Playwright `_electron`, требует `npm run build`) |

## Конфигурация

Скопируйте `.env.example` в `.env`. По умолчанию используется **sandbox**
Yandex Direct API. OAuth-токен в `.env` НЕ хранится — он вводится в UI и
шифруется через `safeStorage` (Keychain).

Архитектура по слоям описана в [`CLAUDE.md`](./CLAUDE.md).
