import type { Campaign } from '@/lib/types'

export type CampaignSearchResultKind =
  | 'Campaign'
  | 'Climate'
  | 'Track'
  | 'Ambient layer'
  | 'Ambient clip'
  | 'Soundboard clip'

export interface CampaignSearchResult {
  id: string
  kind: CampaignSearchResultKind
  title: string
  detail?: string
  climateId?: string
  searchableText: string
}

export const MIN_SEARCH_QUERY_LENGTH = 3

export const CAMPAIGN_SEARCH_RESULT_KINDS: CampaignSearchResultKind[] = [
  'Campaign',
  'Climate',
  'Track',
  'Ambient layer',
  'Ambient clip',
  'Soundboard clip',
]

function fileName(path: string | undefined): string | undefined {
  if (!path) return undefined
  return path.split(/[\\/]/).pop() || undefined
}

/**
 * Creates a flat, searchable index for one campaign. Filesystem paths are
 * intentionally included: they are often the only useful clue when two clips
 * have the same title.
 */
export function indexCampaignSearch(campaign: Campaign): CampaignSearchResult[] {
  const results: CampaignSearchResult[] = [
    {
      id: campaign.id,
      kind: 'Campaign',
      title: campaign.name,
      detail: campaign.description,
      searchableText: [campaign.name, campaign.description].filter(Boolean).join(' '),
    },
  ]

  for (const climate of campaign.climates) {
    results.push({
      id: climate.id,
      kind: 'Climate',
      title: climate.name,
      searchableText: climate.name,
      climateId: climate.id,
    })

    for (const track of climate.tracks) {
      results.push({
        id: track.id,
        kind: 'Track',
        title: track.title,
        detail: `${climate.name} · ${track.source === 'youtube' ? 'YouTube' : (fileName(track.localFilePath) ?? 'Local file')}`,
        climateId: climate.id,
        searchableText: [track.title, track.localFilePath, track.youtubeUrl, track.youtubeVideoId]
          .filter(Boolean)
          .join(' '),
      })
    }

    for (const layer of climate.ambientLayers ?? []) {
      results.push({
        id: layer.id,
        kind: 'Ambient layer',
        title: layer.name,
        detail: climate.name,
        climateId: climate.id,
        searchableText: layer.name,
      })

      for (const clip of layer.clips) {
        results.push({
          id: clip.id,
          kind: 'Ambient clip',
          title: clip.title,
          detail: `${climate.name} · ${layer.name} · ${fileName(clip.localFilePath) ?? 'Local file'}`,
          climateId: climate.id,
          searchableText: [clip.title, clip.localFilePath].filter(Boolean).join(' '),
        })
      }
    }
  }

  for (const sound of campaign.soundboard ?? []) {
    results.push({
      id: sound.id,
      kind: 'Soundboard clip',
      title: sound.name,
      detail: fileName(sound.localFilePath) ?? 'Local file',
      searchableText: [sound.name, sound.localFilePath].filter(Boolean).join(' '),
    })
  }

  return results
}

export function searchCampaign(campaign: Campaign, query: string): CampaignSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) return []
  const terms = normalizedQuery.split(/\s+/).filter(Boolean)

  return indexCampaignSearch(campaign)
    .filter((result) => {
      const haystack = result.searchableText.toLocaleLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
    .sort((left, right) => {
      const kindDifference =
        CAMPAIGN_SEARCH_RESULT_KINDS.indexOf(left.kind) -
        CAMPAIGN_SEARCH_RESULT_KINDS.indexOf(right.kind)
      if (kindDifference !== 0) return kindDifference
      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
    })
}
