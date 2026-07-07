import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type DirectNavigatorApi } from './contracts'

/**
 * Тонкий типизированный мост. Renderer видит только этот объект как
 * `window.api`; прямого доступа к ipcRenderer/electron у него нет
 * (contextIsolation: true, nodeIntegration: false).
 */
const api: DirectNavigatorApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(IpcChannel.appGetVersion)
  },
  campaigns: {
    list: () => ipcRenderer.invoke(IpcChannel.campaignsList)
  },
  token: {
    set: (rawToken: string) => ipcRenderer.invoke(IpcChannel.tokenSet, rawToken),
    has: () => ipcRenderer.invoke(IpcChannel.tokenHas),
    clear: () => ipcRenderer.invoke(IpcChannel.tokenClear)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('api', api)
} else {
  // Фолбэк на случай отключённой изоляции (не должен использоваться в проде).
  ;(globalThis as unknown as { api: DirectNavigatorApi }).api = api
}
