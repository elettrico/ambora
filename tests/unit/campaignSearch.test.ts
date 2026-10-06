import { describe, expect, it } from 'vitest'
import { searchCampaign } from '../../src/renderer/src/lib/campaignSearch'
import type { Campaign } from '../../src/shared/types'

const campaign: Campaign = {
  id: 'campaign-1',
  name: 'The Whispering Mine',
  description: 'A cold underground investigation',
  createdAt: '2026-10-05T00:00:00.000Z',
  updatedAt: '2026-10-05T00:00:00.000Z',
  climates: [
    {
      id: 'climate-1',
      name: 'Flooded tunnel',
      color: '#7B93F5',
      icon: 'waves',
      order: 0,
      crossfadeDuration: 3,
      tracks: [
        {
          id: 'track-0',
          title: 'Abyssal rattling',
          source: 'local',
          localFilePath: '/audio/mine/rattling.ogg',
          order: 0,
        },
        {
          id: 'track-1',
          title: 'Distant machinery',
          source: 'local',
          localFilePath: '/audio/mine/water-pump.ogg',
          order: 1,
        },
      ],
      ambientLayers: [
        {
          id: 'layer-1',
          name: 'Water drips',
          mode: 'random',
          enabled: true,
          volume: 70,
          clips: [
            {
              id: 'clip-1',
              title: 'Metallic drip',
              localFilePath: '/audio/mine/metal-drip.wav',
              order: 0,
            },
          ],
          clipOrder: 'random',
          minDelaySec: 2,
          maxDelaySec: 5,
          order: 0,
        },
      ],
    },
  ],
  soundboard: [
    {
      id: 'sound-1',
      name: 'Cave collapse',
      localFilePath: '/audio/fx/collapse.wav',
      volume: 100,
      playbackMode: 'restart',
      order: 0,
    },
  ],
}

describe('searchCampaign', () => {
  it('finds each kind of campaign content', () => {
    expect(searchCampaign(campaign, 'tunnel')[0]).toMatchObject({
      kind: 'Climate',
      climateId: 'climate-1',
    })
    expect(searchCampaign(campaign, 'machinery')[0]).toMatchObject({ kind: 'Track' })
    expect(searchCampaign(campaign, 'drips')[0]).toMatchObject({ kind: 'Ambient layer' })
    expect(searchCampaign(campaign, 'metallic')[0]).toMatchObject({ kind: 'Ambient clip' })
    expect(searchCampaign(campaign, 'collapse')[0]).toMatchObject({ kind: 'Soundboard clip' })
  })

  it('searches local file paths and requires every search term', () => {
    expect(searchCampaign(campaign, 'water pump')[0]).toMatchObject({ kind: 'Track' })
    expect(searchCampaign(campaign, 'mine collapse')).toEqual([])
  })

  it('requires three characters and orders results by type then alphabetically', () => {
    expect(searchCampaign(campaign, 'mi')).toEqual([])
    expect(searchCampaign(campaign, 'mine').map((result) => result.kind)).toEqual([
      'Campaign',
      'Track',
      'Track',
      'Ambient clip',
    ])
    expect(
      searchCampaign(campaign, 'mine')
        .filter((result) => result.kind === 'Track')
        .map((result) => result.title),
    ).toEqual(['Abyssal rattling', 'Distant machinery'])
  })
})
