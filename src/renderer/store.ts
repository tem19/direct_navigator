import { create } from 'zustand';
import type { Campaign } from '../core/types';
import type { SyncProgress } from '../preload/contracts';

interface AppState {
  campaigns: Campaign[];
  hasToken: boolean;
  loading: boolean;
  syncing: boolean;
  status: string | null;
  loadCampaigns: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
  createTestCampaign: () => Promise<void>;
  pull: () => Promise<void>;
  push: () => Promise<void>;
}

function describe(p: SyncProgress): string {
  if (p.phase === 'error') return `Ошибка: ${p.message ?? 'неизвестно'}`;
  return `${p.message ?? 'Готово'} · баллов потрачено: ${p.unitsSpent}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  campaigns: [],
  hasToken: false,
  loading: false,
  syncing: false,
  status: null,
  loadCampaigns: async () => {
    set({ loading: true });
    const campaigns = await window.api.campaigns.list();
    set({ campaigns, loading: false });
  },
  refreshToken: async () => {
    set({ hasToken: await window.api.token.has() });
  },
  setToken: async (token) => {
    await window.api.token.set(token);
    await get().refreshToken();
  },
  clearToken: async () => {
    await window.api.token.clear();
    await get().refreshToken();
  },
  createTestCampaign: async () => {
    const name = `Тестовая кампания ${new Date().toLocaleTimeString('ru')}`;
    await window.api.campaigns.create(name);
    set({ status: `Создана локально: «${name}» (нажмите Push, чтобы отправить)` });
    await get().loadCampaigns();
  },
  pull: async () => {
    set({ syncing: true, status: 'Синхронизация (Pull)…' });
    const p = await window.api.sync.pull();
    set({ syncing: false, status: describe(p) });
    await get().loadCampaigns();
  },
  push: async () => {
    set({ syncing: true, status: 'Отправка (Push)…' });
    const p = await window.api.sync.push();
    set({ syncing: false, status: describe(p) });
    await get().loadCampaigns();
  },
}));
