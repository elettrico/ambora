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
