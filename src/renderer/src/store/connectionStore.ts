import { create } from 'zustand'

interface ConnectionStore {
  connectedClients: number
  serverUrl: string | null
  setConnectedClients: (count: number) => void
  setServerUrl: (url: string) => void
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connectedClients: 0,
  serverUrl: null,
  setConnectedClients: (count) => set({ connectedClients: count }),
  setServerUrl: (url) => set({ serverUrl: url }),
}))
