# direct_navigator — аналог Директ.Коммандера

Десктопное приложение для массового управления рекламными кампаниями **Яндекс
Директа** (аналог Директ.Коммандера): офлайн-редактирование пачками с
последующей синхронизацией через **Yandex Direct API v5**.

## Платформа

Целевая платформа — **macOS на Apple Silicon (arm64, M1–M4)**. `better-sqlite3`
(нативный модуль) собирается под arm64 через `electron-rebuild`; сборка
дистрибутива — `electron-builder` (mac/arm64). Подпись/нотаризация на этапе
разработки отключены. OAuth-токен хранится через `safeStorage` (Keychain), не в
файлах.

## Стек

- **Electron** (main + preload + renderer), безопасный IPC через `contextBridge`
  (`contextIsolation: true`, `nodeIntegration: false`).
- **React 18 + TypeScript (strict) + Vite** — renderer.
- **better-sqlite3** — локальная БД (доступ только из main; renderer — через IPC).
- **Zustand** — состояние. **TanStack Table + Virtual** — грид.
- **Vitest** (юнит) + **Playwright** (`_electron`, e2e).

## Архитектура (слои)

```
src/
  main/        Electron main: окна, IPC-хендлеры, доступ к БД
  preload/     типизированный мост (contracts.ts) → window.api
  renderer/    React UI (app / features / shared)
  core/        доменная логика: типы, мапперы, валидация (без Electron/SQL)
  db/          схема, миграции, репозитории (better-sqlite3)
  direct-api/  клиент Yandex Direct API v5
  sync/        движок синхронизации local <-> Direct
```

**Границы слоёв (соблюдать строго):**
- `renderer` не импортирует `electron` / `better-sqlite3` / `node:*` — только `window.api`.
- `core` не знает про Electron и SQL.
- SQL живёт только в `db/repositories`.

## Модель синхронизации

Локальная БД — источник правды для офлайн-работы. У синхронизируемых строк есть
`direct_id`, `sync_status` (`synced | new | modified | deleted | conflict`),
снимок серверных полей (`server_hash`) для детекта конфликтов. Pull использует
сервис `changes` для инкрементального обновления; push идёт в порядке
зависимостей (кампания → группа → объявление/ключевое слово) с разбором
поэлементного результата.

## Yandex Direct API v5 — важное

- JSON, один сервис = один URL; методы `add/update/delete/get` + статусные.
- Разработка ведётся в **sandbox** (`api-sandbox.direct.yandex.com`), не в бою.
- Всегда разбирай **частичный успех** (поэлементно), учитывай **баллы (units)**
  из заголовка ответа, делай бэкофф на `error_code 56`.
- OAuth-токен — только через `safeStorage`/Keychain (не в `.env`/файлах); базовый
  URL и Client-Login — из env. Ничего не хардкодить.

## Команды разработки

`/scaffold` `/direct-api` `/data-model` `/sync-engine` `/entity` `/grid-ui`
`/bulk-edit` `/import-export` `/tests` `/plan-feature` — см.
`.claude/commands/README.md` для порядка применения.

## Скрипты

`npm run dev` · `build` · `lint` · `typecheck` · `test` · `test:e2e`

## Безопасность

Не бить по боевому Direct API в тестах и при разработке. OAuth-токен — только в
Keychain (`safeStorage`), не в файлах. Прочие настройки (базовый URL,
Client-Login) — в `.env` (есть `.env.example`), в репозиторий не коммитить.
