---
description: Создать скелет десктоп-приложения (Electron + React + TS + SQLite) — аналог Директ.Коммандера
argument-hint: "[название приложения, по умолчанию direct_navigator]"
---

Ты собираешь скелет десктопного приложения — офлайн-редактора рекламных
кампаний Яндекс Директа (аналог Директ.Коммандера). Название приложения:
`$1` (если пусто — используй `direct_navigator`).

## Целевая платформа

**macOS на Apple Silicon (arm64, M1–M4)** — единственная цель. Подпись и
нотаризацию сейчас НЕ настраиваем (только локальная разработка); оставь место в
конфиге сборки, но не требуй Apple Developer аккаунт.

## Целевой стек (не отклоняйся без веской причины)

- **Electron** (main + preload + renderer), безопасный IPC через `contextBridge`,
  `contextIsolation: true`, `nodeIntegration: false`.
- **React 18 + TypeScript (strict) + Vite** в renderer.
- **better-sqlite3** — локальная БД в main-процессе (синхронный доступ), доступ
  из renderer только через типизированный IPC-мост, НИКОГДА напрямую.
- **Zustand** — состояние renderer.
- **TanStack Table + TanStack Virtual** — таблицы/грид.
- **Vitest** (юнит) + **Playwright** (e2e через `_electron`).
- **ESLint + Prettier**, `tsconfig` с `"strict": true`.

## Что сделать

1. Инициализируй проект и зависимости. Если папка уже содержит код — не ломай
   существующее, впиши недостающее.
2. Разложи по слоям (важно для последующих команд — соблюдай пути):
   ```
   src/
     main/          # Electron main: окна, IPC-хендлеры, доступ к БД
     preload/       # contextBridge API (типизированный мост)
     renderer/      # React-приложение (UI)
       app/         # роутинг, layout, провайдеры
       features/    # фичи по доменам (campaigns, adgroups, ads, keywords)
       shared/      # ui-kit, hooks, утилиты
     core/          # доменная логика без UI/Electron: типы сущностей, валидация
     db/            # схема, миграции, репозитории (better-sqlite3)
     direct-api/    # клиент Yandex Direct API v5
     sync/          # движок синхронизации local <-> Direct
   ```
3. Настрой типобезопасный IPC-мост: определи канал-контракты в одном месте
   (`src/preload/contracts.ts`), сгенерируй тонкий типизированный API в preload,
   реализуй хендлеры в main. Renderer видит только `window.api.*`.
4. Добавь npm-скрипты: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`.
5. Заполни `.env.example`: `YANDEX_API_BASE=https://api-sandbox.direct.yandex.com/json/v5/`,
   `YANDEX_CLIENT_LOGIN=`. По умолчанию разработка идёт в **sandbox**. OAuth-токен
   НЕ хранить в `.env`/файлах — только в системном хранилище (см. п.6).
6. **Токен через Keychain**: настрой безопасное хранение OAuth-токена Яндекс
   Директа через Electron `safeStorage` (шифрование ключом из macOS Keychain).
   Токен вводится в UI, шифруется в main, кладётся в БД/файл только в
   зашифрованном виде. В логи и renderer сырой токен не попадает.
7. **Нативный модуль**: подключи `better-sqlite3` и настрой `electron-rebuild`,
   чтобы модуль собирался под arm64/текущий Electron. Добавь `electron-builder`
   с таргетом `mac` / `arm64` (dmg + zip), `hardenedRuntime` и подпись оставь
   отключёнными на этапе разработки, `icon` → `.icns` (заглушка допустима).
8. **Нативность macOS**: системное меню в верхней строке (шаблон меню с
   About/Quit/Edit), поведение «закрытие окна не завершает приложение»
   (`window-all-closed` / повторное открытие по клику на Dock).
9. Создай минимальное окно с пустым layout и заглушкой «Кампании», чтобы
   `npm run dev` запускался.

## Критерии готовности

- `npm run dev` открывает окно без ошибок в консоли на Apple Silicon.
- `better-sqlite3` собран под arm64 и грузится в main без ошибок ABI.
- OAuth-токен хранится только зашифрованным (`safeStorage`), не в открытом виде.
- `npm run typecheck` и `npm run lint` проходят.
- Renderer не импортирует `electron`, `better-sqlite3` или `node:*` напрямую.

Покажи итоговое дерево файлов и команды запуска. Ничего не коммить — это сделаю я
после проверки.
