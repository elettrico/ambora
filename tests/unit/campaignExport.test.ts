import { describe, it, expect } from 'vitest'
import type { Campaign } from '../../src/shared/types'
import type { AmboraExportFile } from '../../src/shared/exportTypes'
import { AMBORA_FILE_VERSION } from '../../src/shared/exportTypes'
import {
  serializeCampaignForExport,
  deserializeCampaignFromImport,
} from '../../src/renderer/src/lib/campaignExport'

const sampleCampaign: Campaign = {
  id: 'campaign-uuid-123',
  name: 'Curse of Strahd',
  description: 'Gothic horror campaign',
  climates: [
    {
      id: 'climate-uuid-456',
      name: 'Barovia Village',
      color: '#DC3545',
      icon: 'Castle',
      order: 0,
      crossfadeDuration: 4,
      tracks: [
        {
          id: 'track-uuid-789',
          title: 'Dark Ambience',
          source: 'youtube',
          youtubeVideoId: 'abc123',
          youtubeUrl: 'https://youtube.com/watch?v=abc123',
          duration: 300,
          order: 0,
        },
        {
          id: 'track-uuid-012',
          title: 'Local Track',
          source: 'local',
          localFilePath: '/Users/dm/music/tavern.mp3',
          duration: 180,
          order: 1,
        },
      ],
    },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-06-15T12:00:00.000Z',
}

describe('serializeCampaignForExport', () => {
  it('strips IDs from campaign, climates, and tracks', () => {
    const json = serializeCampaignForExport(sampleCampaign, '0.1.0')
    const parsed = JSON.parse(json) as AmboraExportFile
    const campaign = parsed.campaign
    expect(campaign).not.toHaveProperty('id')
    expect(campaign).not.toHaveProperty('createdAt')
    expect(campaign).not.toHaveProperty('updatedAt')
    expect(campaign.climates[0]).not.toHaveProperty('id')
    expect(campaign.climates[0].tracks[0]).not.toHaveProperty('id')
    expect(campaign.climates[0].tracks[1]).not.toHaveProperty('id')
  })

  it('strips localFilePath from tracks', () => {
    const json = serializeCampaignForExport(sampleCampaign, '0.1.0')
    const parsed = JSON.parse(json) as AmboraExportFile
    const localTrack = parsed.campaign.climates[0].tracks[1]
    expect(localTrack).not.toHaveProperty('localFilePath')
  })

  it('preserves YouTube data', () => {
    const json = serializeCampaignForExport(sampleCampaign, '0.1.0')
    const parsed = JSON.parse(json) as AmboraExportFile
    const ytTrack = parsed.campaign.climates[0].tracks[0]
    expect(ytTrack.youtubeVideoId).toBe('abc123')
    expect(ytTrack.youtubeUrl).toBe('https://youtube.com/watch?v=abc123')
    expect(ytTrack.source).toBe('youtube')
    expect(ytTrack.duration).toBe(300)
  })

  it('includes correct envelope with version and app version', () => {
    const json = serializeCampaignForExport(sampleCampaign, '0.1.0')
    const parsed = JSON.parse(json) as AmboraExportFile
    expect(parsed.ambora.version).toBe(AMBORA_FILE_VERSION)
    expect(parsed.ambora.appVersion).toBe('0.1.0')
    expect(typeof parsed.ambora.exportedAt).toBe('string')
  })

  it('preserves campaign name and description', () => {
    const json = serializeCampaignForExport(sampleCampaign, '0.1.0')
    const parsed = JSON.parse(json) as AmboraExportFile
    expect(parsed.campaign.name).toBe('Curse of Strahd')
    expect(parsed.campaign.description).toBe('Gothic horror campaign')
  })
})

describe('deserializeCampaignFromImport', () => {
  function makeValidExport(): string {
    return serializeCampaignForExport(sampleCampaign, '0.1.0')
  }

  it('generates fresh UUIDs for all entities', () => {
    const result = deserializeCampaignFromImport(makeValidExport())
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.id).not.toBe('campaign-uuid-123')
    expect(result.campaign.climates[0].id).not.toBe('climate-uuid-456')
    expect(result.campaign.climates[0].tracks[0].id).not.toBe('track-uuid-789')
  })

  it('generates fresh timestamps', () => {
    const result = deserializeCampaignFromImport(makeValidExport())
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.createdAt).not.toBe('2025-01-01T00:00:00.000Z')
    expect(result.campaign.updatedAt).not.toBe('2025-06-15T12:00:00.000Z')
  })

  it('preserves campaign name, description, and climate structure', () => {
    const result = deserializeCampaignFromImport(makeValidExport())
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.name).toBe('Curse of Strahd')
    expect(result.campaign.description).toBe('Gothic horror campaign')
    expect(result.campaign.climates).toHaveLength(1)
    expect(result.campaign.climates[0].name).toBe('Barovia Village')
    expect(result.campaign.climates[0].tracks).toHaveLength(2)
  })

  it('warns about local tracks', () => {
    const result = deserializeCampaignFromImport(makeValidExport())
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('1 local track')
    expect(result.warnings[0]).toContain('Barovia Village')
  })

  it('rejects invalid JSON', () => {
    const result = deserializeCampaignFromImport('not json at all {{{')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('Invalid JSON')
  })

  it('rejects missing envelope', () => {
    const result = deserializeCampaignFromImport(JSON.stringify({ campaign: { name: 'Test' } }))
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('missing envelope')
  })

  it('rejects future version', () => {
    const data = {
      ambora: { version: 999, exportedAt: '', appVersion: '99.0.0' },
      campaign: { name: 'Test', climates: [] },
    }
    const result = deserializeCampaignFromImport(JSON.stringify(data))
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('newer version')
  })

  it('rejects missing campaign data', () => {
    const data = { ambora: { version: 1, exportedAt: '', appVersion: '0.1.0' } }
    const result = deserializeCampaignFromImport(JSON.stringify(data))
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('missing campaign data')
  })

  it('rejects campaign without name', () => {
    const data = {
      ambora: { version: 1, exportedAt: '', appVersion: '0.1.0' },
      campaign: { name: '', climates: [] },
    }
    const result = deserializeCampaignFromImport(JSON.stringify(data))
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toContain('no name')
  })

  it('round-trip: export then import produces equivalent data', () => {
    const json = serializeCampaignForExport(sampleCampaign, '0.1.0')
    const result = deserializeCampaignFromImport(json)
    expect(result.success).toBe(true)
    if (!result.success) return

    const imported = result.campaign
    expect(imported.name).toBe(sampleCampaign.name)
    expect(imported.description).toBe(sampleCampaign.description)
    expect(imported.climates).toHaveLength(sampleCampaign.climates.length)

    const origClimate = sampleCampaign.climates[0]
    const importedClimate = imported.climates[0]
    expect(importedClimate.name).toBe(origClimate.name)
    expect(importedClimate.color).toBe(origClimate.color)
    expect(importedClimate.icon).toBe(origClimate.icon)
    expect(importedClimate.crossfadeDuration).toBe(origClimate.crossfadeDuration)
    expect(importedClimate.tracks).toHaveLength(origClimate.tracks.length)

    const origYtTrack = origClimate.tracks[0]
    const importedYtTrack = importedClimate.tracks[0]
    expect(importedYtTrack.title).toBe(origYtTrack.title)
    expect(importedYtTrack.source).toBe('youtube')
    expect(importedYtTrack.youtubeVideoId).toBe(origYtTrack.youtubeVideoId)
    expect(importedYtTrack.youtubeUrl).toBe(origYtTrack.youtubeUrl)
    expect(importedYtTrack.duration).toBe(origYtTrack.duration)
  })

  it('importing same file twice produces different IDs', () => {
    const json = makeValidExport()
    const result1 = deserializeCampaignFromImport(json)
    const result2 = deserializeCampaignFromImport(json)
    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)
    if (!result1.success || !result2.success) return
    expect(result1.campaign.id).not.toBe(result2.campaign.id)
    expect(result1.campaign.climates[0].id).not.toBe(result2.campaign.climates[0].id)
  })
})
