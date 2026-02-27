import { ElectronAPI } from '@electron-toolkit/preload'
import type { Campaign } from '../shared/types'

interface AmboraAPI {
  getCampaigns(): Promise<Campaign[]>
  saveCampaigns(campaigns: Campaign[]): void
  getPathForFile(file: File): string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AmboraAPI
  }
}
