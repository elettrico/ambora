export interface Campaign {
  id: string
  name: string
  description?: string
  climates: Climate[]
  createdAt: string
  updatedAt: string
}

export interface Climate {
  id: string
  name: string
  color: string
  icon: string
  tracks: Track[]
  order: number
  crossfadeDuration: number
}

export interface Track {
  id: string
  title: string
  source: 'youtube' | 'local'
  youtubeVideoId?: string
  youtubeUrl?: string
  localFilePath?: string
  duration?: number
  order: number
}

export interface AppState {
  activeCampaignId: string | null
  activeClimateId: string | null
  activeTrackId: string | null
  isPlaying: boolean
  volume: number
  isFadingToSilence: boolean
}

// WebSocket protocol types

export type RemoteCommand =
  | { type: 'activate-climate'; payload: { climateId: string } }
  | { type: 'play-pause' }
  | { type: 'skip-track' }
  | { type: 'set-volume'; payload: { volume: number } }
  | { type: 'toggle-shuffle' }

export type RemoteStateMessage =
  | { type: 'full-state'; payload: RemoteFullState }
  | { type: 'playback-update'; payload: PlaybackState }
  | { type: 'campaigns-update'; payload: { campaigns: Campaign[] } }

export interface RemoteFadeAnimation {
  climateId: string
  direction: 'in' | 'out'
  durationMs: number
  startedAt: number
}

export interface PlaybackState {
  activeCampaignId: string | null
  activeClimateId: string | null
  activeTrackId: string | null
  isPlaying: boolean
  volume: number
  isFadingToSilence: boolean
  isShuffled: boolean
  fadeAnimations: RemoteFadeAnimation[]
}

export interface RemoteFullState {
  campaigns: Campaign[]
  activeCampaignId: string | null
  playback: PlaybackState
}
