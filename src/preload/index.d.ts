import { ElectronAPI } from '@electron-toolkit/preload'
import type { Campaign } from '../shared/types'

interface AmboraAPI {
  getCampaigns(): Promise<Campaign[]>
  saveCampaigns(campaigns: Campaign[]): void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AmboraAPI
  }
}
