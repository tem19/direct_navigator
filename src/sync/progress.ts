import type { SyncProgressEvent } from './types';

export type ProgressListener = (event: SyncProgressEvent) => void;

/**
 * Простой типизированный стрим прогресса. Движок эмитит события, UI (через IPC)
 * подписывается. Без node:events, чтобы порт оставался лёгким.
 */
export class ProgressEmitter {
  private readonly listeners = new Set<ProgressListener>();

  on(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: SyncProgressEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // подписчик UI не должен ронять синхронизацию
      }
    }
  }
}
