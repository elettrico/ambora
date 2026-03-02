export const AMBORA_FILE_VERSION = 1

export const AMBORA_FILE_FILTER = {
  name: 'Ambora Campaign',
  extensions: ['ambora'],
}

export interface ExportedTrack {
  title: string
  source: 'youtube' | 'local'
  youtubeVideoId?: string
  youtubeUrl?: string
  duration?: number
  order: number
}

export interface ExportedClimate {
  name: string
  color: string
  icon: string
  order: number
  crossfadeDuration: number
  tracks: ExportedTrack[]
}

export interface ExportedCampaign {
  name: string
  description?: string
  climates: ExportedClimate[]
}

export interface AmboraExportFile {
  ambora: {
    version: number
    exportedAt: string
    appVersion: string
  }
  campaign: ExportedCampaign
}
