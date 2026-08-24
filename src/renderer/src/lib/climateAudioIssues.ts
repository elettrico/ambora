import type { Climate } from '@/lib/types'
import type { TrackDiagnostic } from '@/store/diagnosticsStore'

export interface ClimateAudioIssues {
  trackCount: number
  clipCount: number
  emptyLayerCount: number
  total: number
  summary: string
}

export function climateAudioIssues(
  climate: Climate,
  unplayable: Readonly<Record<string, TrackDiagnostic>>,
): ClimateAudioIssues {
  const trackCount = new Set(
    climate.tracks
      .filter(
        (track) =>
          unplayable[track.id] || (track.source === 'local' && !track.localFilePath?.trim()),
      )
      .map((track) => track.id),
  ).size
  const emptyLayerCount = (climate.ambientLayers ?? []).filter(
    (layer) => layer.clips.length === 0,
  ).length
  const clipCount = new Set(
    (climate.ambientLayers ?? [])
      .flatMap((layer) => layer.clips)
      .filter((clip) => unplayable[clip.id] || !clip.localFilePath.trim())
      .map((clip) => clip.id),
  ).size
  const total = trackCount + clipCount + emptyLayerCount
  const summary = [
    trackCount > 0 ? `${String(trackCount)} unplayable track${trackCount === 1 ? '' : 's'}` : '',
    clipCount > 0
      ? `${String(clipCount)} missing or unplayable ambient clip${clipCount === 1 ? '' : 's'}`
      : '',
    emptyLayerCount > 0
      ? `${String(emptyLayerCount)} ambient layer${emptyLayerCount === 1 ? '' : 's'} without clips`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return { trackCount, clipCount, emptyLayerCount, total, summary }
}
