/**
 * Единый контракт IPC-мостa. Здесь описаны и имена каналов, и типы
 * запросов/ответов. Main реализует хендлеры, preload выставляет типизированный
 * `window.api`. Renderer импортирует ТОЛЬКО типы отсюда (не саму реализацию).
 */
import type { Campaign } from '../core/types';

/** Остаток баллов Яндекс Директа (units) из заголовка ответа API. */
export interface UnitsInfo {
  spent: number;
  balance: number;
  dailyLimit: number;
}

export interface SyncProgress {
  phase: 'idle' | 'pull' | 'push' | 'done' | 'error';
  processed: number;
  total: number;
  unitsSpent: number;
  message?: string;
}

/**
 * Поверхность API, доступная renderer через `window.api`.
 * Каждый метод соответствует IPC-каналу с тем же путём (`token:setToken` и т.п.).
 */
export interface Api {
  token: {
    /** Сохранить OAuth-токен (шифруется в main через safeStorage). */
    set(token: string): Promise<void>;
    /** Есть ли сохранённый токен. Сам токен в renderer не отдаётся. */
    has(): Promise<boolean>;
    clear(): Promise<void>;
  };
  campaigns: {
    list(): Promise<Campaign[]>;
  };
  sync: {
    pull(): Promise<SyncProgress>;
    push(): Promise<SyncProgress>;
  };
  system: {
    /** Проверка живости main + версия схемы БД. */
    ping(): Promise<{ ok: true; schemaVersion: number }>;
  };
}

/** Карта каналов IPC. Значения — строковые имена, используемые ipcMain/ipcRenderer. */
export const CHANNELS = {
  tokenSet: 'token:set',
  tokenHas: 'token:has',
  tokenClear: 'token:clear',
  campaignsList: 'campaigns:list',
  syncPull: 'sync:pull',
  syncPush: 'sync:push',
  systemPing: 'system:ping',
} as const;

export type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS];
