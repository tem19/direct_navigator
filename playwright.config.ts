import { defineConfig } from '@playwright/test'

/**
 * E2E через Playwright `_electron`. Тесты запускают собранное приложение,
 * поэтому перед прогоном нужен `npm run build` (out/main/index.js).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list'
})
