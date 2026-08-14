import { describe, expect, it } from 'vitest'
import {
  remotePayloadContainsPaths,
  toRemoteCampaigns,
  toRemoteFullState,
} from '../../src/shared/remoteDto'
import type { Campaign, PlaybackState } from '../../src/shared/types'

const playback: PlaybackState = {
  activeCampaignId: 'camp-1',
  activeClimateId: 'cl-1',
  activeTrackId: 'tr-1',
  isPlaying: true,
  volume: 80,
  isFadingToSilence: false,
  isShuffled: false,
  fadeAnimations: [],
  ambientRuntime: {},
}

const campaignWithPaths: Campaign = {
  id: 'camp-1',
  name: 'Forest',
  description: 'secret notes',
  climates: [
    {
      id: 'cl-1',
      name: 'Campfire',
      color: '#C4784A',
      icon: 'Flame',
      order: 0,
      crossfadeDuration: 3,
      tracks: [
        {
          id: 'tr-1',
          title: 'Embers',
          source: 'local',
          localFilePath: '/Users/dm/Music/embers.mp3',
          duration: 120,
          order: 0,
        },
        {
          id: 'tr-2',
          title: 'Rain YT',
          source: 'youtube',
          youtubeVideoId: 'abc123',
          youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
          order: 1,
        },
      ],
      ambientLayers: [
        {
          id: 'lay-1',
          name: 'Wind',
          mode: 'loop',
          enabled: true,
          volume: 50,
          clips: [
            {
              id: 'clip-1',
              title: 'Gust',
              localFilePath: '/Users/dm/Music/wind.wav',
              duration: 30,
              order: 0,
            },
          ],
          clipOrder: 'shuffle',
          minDelaySec: 8,
          maxDelaySec: 20,
          order: 0,
        },
      ],
    },
  ],
  soundboard: [
    {
      id: 'sound-1',
      name: 'Thunder',
      localFilePath: '/Users/dm/Sounds/thunder.wav',
      volume: 70,
      shortcutKey: 't',
      icon: 'CloudLightning',
      iconColor: '#7B93F5',
      playbackMode: 'restart',
      order: 0,
    },
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('toRemoteCampaigns', () => {
  it('strips filesystem paths and machine-local metadata', () => {
    const remote = toRemoteCampaigns([campaignWithPaths])
    expect(remote).toEqual([
      {
        id: 'camp-1',
        name: 'Forest',
        climates: [
          {
            id: 'cl-1',
            name: 'Campfire',
            color: '#C4784A',
            icon: 'Flame',
            order: 0,
            tracks: [
              { id: 'tr-1', title: 'Embers', order: 0 },
              { id: 'tr-2', title: 'Rain YT', order: 1 },
            ],
            ambientLayers: [
              {
                id: 'lay-1',
                name: 'Wind',
                mode: 'loop',
                enabled: true,
                volume: 50,
                order: 0,
              },
            ],
          },
        ],
        soundboard: [
          {
            id: 'sound-1',
            name: 'Thunder',
            shortcutKey: 't',
            icon: 'CloudLightning',
            iconColor: '#7B93F5',
            order: 0,
          },
        ],
      },
    ])
  })

  it('serialized full-state contains no absolute paths or localFilePath keys', () => {
    const state = toRemoteFullState({
      campaigns: [campaignWithPaths],
      activeCampaignId: 'camp-1',
      playback,
    })
    const json = JSON.stringify(state)
    expect(json).not.toContain('localFilePath')
    expect(json).not.toContain('/Users/')
    expect(json).not.toContain('embers.mp3')
    expect(json).not.toContain('youtubeUrl')
    expect(json).not.toContain('youtubeVideoId')
    expect(json).not.toContain('crossfadeDuration')
    expect(json).not.toContain('description')
    expect(remotePayloadContainsPaths(state)).toBe(false)
  })

  it('detects leaked paths in a payload', () => {
    expect(remotePayloadContainsPaths({ localFilePath: '/tmp/x.mp3' })).toBe(true)
    expect(remotePayloadContainsPaths({ path: 'C:\\Users\\dm\\a.mp3' })).toBe(true)
    expect(remotePayloadContainsPaths({ name: 'Campfire' })).toBe(false)
  })
})
