import { create } from 'zustand';
import type { Campaign } from '../core/types';

interface AppState {
  campaigns: Campaign[];
  hasToken: boolean;
  loading: boolean;
  loadCampaigns: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  campaigns: [],
  hasToken: false,
  loading: false,
  loadCampaigns: async () => {
    set({ loading: true });
    const campaigns = await window.api.campaigns.list();
    set({ campaigns, loading: false });
  },
  refreshToken: async () => {
    const hasToken = await window.api.token.has();
    set({ hasToken });
  },
}));
