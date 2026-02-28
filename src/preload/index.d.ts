import { ElectronAPI } from '@electron-toolkit/preload'
import type { Campaign, RemoteCommand, RemoteStateMessage, RemoteFullState } from '../shared/types'

interface AmboraAPI {
  getCampaigns(): Promise<Campaign[]>
  saveCampaigns(campaigns: Campaign[]): void
  getPathForFile(file: File): string
  registerAudioPath(filePath: string): Promise<string>
  getYouTubeTitle(videoUrl: string): Promise<string | null>
  getServerInfo(): Promise<{ port: number; localIP: string }>
  onRemoteCommand(callback: (command: RemoteCommand) => void): () => void
  sendStateUpdate(message: RemoteStateMessage): void
  sendFullState(state: RemoteFullState): void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AmboraAPI
  }
}
