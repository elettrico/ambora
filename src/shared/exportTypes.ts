/**
 * v3 adds the campaign soundboard. The bump prevents older Ambora versions from
 * importing a file while silently dropping its one-shot effects.
 */
export const AMBORA_FILE_VERSION = 3

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

/**
 * Ambient clips are always local files, so — like local tracks — only the title
 * survives an export. The path is machine-specific and would be meaningless on
 * the importing side.
 */
export interface ExportedAmbientClip {
  title: string
  duration?: number
  order: number
}

export interface ExportedAmbientLayer {
  name: string
  mode: 'loop' | 'random' | 'oneshot'
  enabled: boolean
  volume: number
  clipOrder: 'shuffle' | 'random' | 'sequential'
  minDelaySec: number
  maxDelaySec: number
  order: number
  clips: ExportedAmbientClip[]
}

export interface ExportedClimate {
  name: string
  color: string
  icon: string
  order: number
  crossfadeDuration: number
  tracks: ExportedTrack[]
  ambientLayers?: ExportedAmbientLayer[]
}

export interface ExportedCampaign {
  name: string
  description?: string
  climates: ExportedClimate[]
  soundboard?: ExportedSoundboardSound[]
}

export interface ExportedSoundboardSound {
  name: string
  volume: number
  shortcutKey?: string
  icon?: string
  iconColor?: string
  playbackMode: 'ignore' | 'stop' | 'restart' | 'multiple'
  duration?: number
  order: number
}

export interface AmboraExportFile {
  ambora: {
    version: number
    exportedAt: string
    appVersion: string
  }
  campaign: ExportedCampaign
}
