import { app, ipcMain } from 'electron'
import { IpcChannel } from '@preload/contracts'
import type { AppDatabase } from '@db/connection'
import type { TokenStore } from './tokenStore'

/**
 * Регистрация всех IPC-хендлеров. Имена каналов берём из общего контракта,
 * чтобы main и preload не расходились. Renderer доступа к ipcMain не имеет.
 */
export function registerIpcHandlers(db: AppDatabase, tokens: TokenStore): void {
  ipcMain.handle(IpcChannel.appGetVersion, () => app.getVersion())

  ipcMain.handle(IpcChannel.campaignsList, () => db.campaigns.list())

  ipcMain.handle(IpcChannel.tokenSet, (_event, rawToken: string) => {
    tokens.set(rawToken)
  })
  ipcMain.handle(IpcChannel.tokenHas, () => tokens.has())
  ipcMain.handle(IpcChannel.tokenClear, () => {
    tokens.clear()
  })
}
