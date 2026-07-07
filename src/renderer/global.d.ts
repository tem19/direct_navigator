import type { Api } from '../preload/contracts';

declare global {
  interface Window {
    /** Типизированный IPC-мост, выставленный preload через contextBridge. */
    api: Api;
  }
}

export {};
