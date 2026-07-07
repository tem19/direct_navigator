import { join } from 'node:path'
import { test, expect, _electron as electron } from '@playwright/test'

/**
 * Дымовой e2e: приложение запускается, окно открывается, виден раздел «Кампании».
 * Требует предварительной сборки (`npm run build`) — грузим out/main/index.js.
 */
test('приложение стартует и показывает раздел «Кампании»', async () => {
  const app = await electron.launch({
    args: [join(__dirname, '..', 'out', 'main', 'index.js')]
  })

  const window = await app.firstWindow()
  await expect(window.locator('text=Кампании').first()).toBeVisible()

  await app.close()
})
