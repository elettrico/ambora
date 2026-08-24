import { describe, expect, it } from 'vitest'
import { climateAudioIssues } from '../../src/renderer/src/lib/climateAudioIssues'
import type { Climate } from '../../src/shared/types'

const climate: Climate = {
  id: 'climate-1',
  name: 'Ruins',
  color: '#7B93F5',
  icon: 'Castle',
  tracks: [
    { id: 'track-missing', title: 'Missing', source: 'local', order: 0 },
    {
      id: 'track-ok',
      title: 'Present',
      source: 'local',
      localFilePath: '/audio/present.mp3',
      order: 1,
    },
  ],
  ambientLayers: [
    {
      id: 'empty-layer',
      name: 'Empty',
      mode: 'loop',
      enabled: true,
      volume: 50,
      clips: [],
      clipOrder: 'shuffle',
      minDelaySec: 5,
      maxDelaySec: 10,
      order: 0,
    },
    {
      id: 'broken-layer',
      name: 'Broken',
      mode: 'oneshot',
      enabled: true,
      volume: 50,
      clips: [{ id: 'clip-broken', title: 'Broken', localFilePath: '/gone.wav', order: 0 }],
      clipOrder: 'shuffle',
      minDelaySec: 5,
      maxDelaySec: 10,
      order: 1,
    },
  ],
  order: 0,
  crossfadeDuration: 4,
}

describe('climateAudioIssues', () => {
  it('counts missing tracks, broken clips, and empty ambient layers', () => {
    const issues = climateAudioIssues(climate, {
      'clip-broken': { source: 'probe', reason: 'File not found' },
    })

    expect(issues).toMatchObject({ trackCount: 1, clipCount: 1, emptyLayerCount: 1, total: 3 })
    expect(issues.summary).toContain('1 unplayable track')
    expect(issues.summary).toContain('1 missing or unplayable ambient clip')
    expect(issues.summary).toContain('1 ambient layer without clips')
  })

  it('returns no warning for a fully playable climate', () => {
    const healthy: Climate = {
      ...climate,
      tracks: [climate.tracks[1]],
      ambientLayers: [],
    }
    expect(climateAudioIssues(healthy, {})).toMatchObject({ total: 0, summary: '' })
  })
})
