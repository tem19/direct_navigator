import { create } from 'zustand'
import type { Campaign } from '@core/types'

interface CampaignsState {
  campaigns: Campaign[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
}

/**
 * Состояние раздела «Кампании». Данные приходят только через window.api
 * (IPC → main → БД). Renderer не трогает БД напрямую.
 */
export const useCampaignsStore = create<CampaignsState>((set) => ({
  campaigns: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const campaigns = await window.api.campaigns.list()
      set({ campaigns, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  }
}))
