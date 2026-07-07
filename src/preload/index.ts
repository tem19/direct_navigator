import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS, type Api } from './contracts';

/**
 * Тонкий типизированный мост. Никакой логики — только проксирование вызовов в
 * main через ipcRenderer.invoke. Renderer видит это как `window.api`.
 */
const api: Api = {
  token: {
    set: (token) => ipcRenderer.invoke(CHANNELS.tokenSet, token),
    has: () => ipcRenderer.invoke(CHANNELS.tokenHas),
    clear: () => ipcRenderer.invoke(CHANNELS.tokenClear),
  },
  campaigns: {
    list: () => ipcRenderer.invoke(CHANNELS.campaignsList),
  },
  sync: {
    pull: () => ipcRenderer.invoke(CHANNELS.syncPull),
    push: () => ipcRenderer.invoke(CHANNELS.syncPush),
  },
  system: {
    ping: () => ipcRenderer.invoke(CHANNELS.systemPing),
  },
};

contextBridge.exposeInMainWorld('api', api);
