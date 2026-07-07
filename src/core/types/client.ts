import type { SyncMeta } from './common';

/**
 * Клиент (рекламодатель). Верх иерархии Директа.
 * Обычно один на приложение (текущий Client-Login), но модель допускает несколько.
 */
export interface Client extends SyncMeta {
  /** Логин клиента в Директе (Client-Login). */
  login: string;
  /** Отображаемое имя клиента. */
  name: string | null;
}

export interface NewClient {
  directId?: number | null;
  login: string;
  name?: string | null;
}
