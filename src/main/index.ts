import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { AppDatabase } from '@db/connection'
import { registerIpcHandlers } from './ipc'
import { TokenStore } from './tokenStore'
import { installAppMenu } from './menu'
import { createMainWindow } from './window'

let database: AppDatabase | null = null

function initDatabase(): AppDatabase {
  // Файл БД — в пользовательской директории данных приложения.
  const dbPath = join(app.getPath('userData'), 'direct_navigator.db')
  return new AppDatabase(dbPath)
}

app.whenReady().then(() => {
  database = initDatabase()
  const tokens = new TokenStore(database.settings)

  registerIpcHandlers(database, tokens)
  installAppMenu()
  createMainWindow()

  // macOS: клик по иконке в Dock при отсутствии окон — открыть новое.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// macOS: закрытие всех окон НЕ завершает приложение (остаётся в Dock).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  database?.close()
  database = null
})
