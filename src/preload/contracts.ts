/**
 * Единая точка описания IPC-контракта между main и renderer.
 *
 * Здесь — ТОЛЬКО типы и строковые имена каналов. Никаких импортов electron
 * или better-sqlite3: этот файл читают оба слоя (main и renderer), а renderer
 * не должен тянуть за собой main-зависимости.
 */
import type { Campaign } from '@core/types'

/** Имена IPC-каналов. Держим в одном месте, чтобы не расходились main/preload. */
export const IpcChannel = {
  appGetVersion: 'app:getVersion',
  campaignsList: 'campaigns:list',
  tokenSet: 'token:set',
  tokenHas: 'token:has',
  tokenClear: 'token:clear'
} as const

export type IpcChannelName = (typeof IpcChannel)[keyof typeof IpcChannel]

/**
 * Контракт API, который preload прокидывает в renderer как `window.api`.
 * Каждый метод — тонкая обёртка над `ipcRenderer.invoke`.
 */
export interface DirectNavigatorApi {
  app: {
    getVersion(): Promise<string>
  }
  campaigns: {
    list(): Promise<Campaign[]>
  }
  token: {
    /** Зашифровать и сохранить OAuth-токен. Сырой токен не покидает main. */
    set(rawToken: string): Promise<void>
    /** Есть ли сохранённый токен (без его раскрытия). */
    has(): Promise<boolean>
    clear(): Promise<void>
  }
}

declare global {
  interface Window {
    api: DirectNavigatorApi
  }
}
