import { create } from 'zustand'
import type { RemoteClientInfo } from '@/lib/types'

interface ConnectionStore {
  connectedClients: number
  clients: RemoteClientInfo[]
  serverUrl: string | null
  setConnectedClients: (count: number, clients: RemoteClientInfo[]) => void
  setServerUrl: (url: string) => void
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connectedClients: 0,
  clients: [],
  serverUrl: null,
  setConnectedClients: (count, clients) => set({ connectedClients: count, clients }),
  setServerUrl: (url) => set({ serverUrl: url }),
}))
