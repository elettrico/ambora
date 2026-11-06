import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Climate } from '../../src/shared/types'

interface AudioEngineInternals {
  currentClimate: Climate | null
  currentTrackIndex: number
  activeChannelId: 'A' | 'B'
  channelA: {
    player: { getCurrentTime: () => number }
  }
  climateSnapshots: Map<
    string,
    { trackIndex: number; positionSec: number; trackFingerprint: string }
  >
  pendingRestartClimateId: string | null
  playedOnceTrackIds: Set<string>
  getNextTrackIndex: () => number
  hasUnplayedOnceTrack: () => boolean
  saveClimateSnapshot: () => void
}

function climate(): Climate {
  return {
    id: 'climate-1',
    name: 'Forest',
    color: '#2D9A5D',
    icon: 'TreePine',
    order: 0,
    crossfadeDuration: 4,
    tracks: [
      {
        id: 'track-a',
        title: 'First',
        source: 'local',
        localFilePath: '/first.mp3',
        order: 0,
      },
      {
        id: 'track-b',
        title: 'Second',
        source: 'local',
        localFilePath: '/second.mp3',
        order: 1,
      },
    ],
  }
}

describe('AudioEngine position reset', () => {
  let engine: import('../../src/renderer/src/audio/AudioEngine').AudioEngine
  let internal: AudioEngineInternals
  let useAudioStore: typeof import('../../src/renderer/src/store/audioStore').useAudioStore

  beforeAll(async () => {
    vi.stubGlobal('window', { api: { platform: 'linux' } })
    ;({ useAudioStore } = await import('../../src/renderer/src/store/audioStore'))
    const { AudioEngine } = await import('../../src/renderer/src/audio/AudioEngine')
    engine = AudioEngine.getInstance()
    internal = engine as unknown as AudioEngineInternals
  })

  beforeEach(() => {
    internal.currentClimate = climate()
    internal.currentTrackIndex = 1
    internal.activeChannelId = 'A'
    internal.channelA = { player: { getCurrentTime: () => 95 } }
    internal.climateSnapshots.clear()
    internal.pendingRestartClimateId = null
    useAudioStore.setState({
      activeClimateId: 'climate-1',
      activeTrackId: 'track-b',
      isPlaying: false,
      isFadingToSilence: false,
    })
  })

  it('does not recreate the current resume point after positions are reset', () => {
    engine.resetClimatePositions()
    internal.saveClimateSnapshot()

    expect(internal.climateSnapshots.size).toBe(0)
    expect(internal.pendingRestartClimateId).toBe('climate-1')
  })

  it('restarts the first track instead of resuming the loaded player', () => {
    engine.resetClimatePositions()
    const activate = vi.spyOn(engine, 'activateClimate').mockResolvedValue(undefined)

    engine.resume()

    expect(activate).toHaveBeenCalledWith(internal.currentClimate, 'track-a')
    activate.mockRestore()
  })

  it('advances through a once playlist without wrapping to an already played track', () => {
    internal.currentClimate = { ...climate(), musicPlaybackMode: 'once' }
    internal.currentTrackIndex = 0
    internal.playedOnceTrackIds = new Set(['track-a'])

    expect(internal.hasUnplayedOnceTrack()).toBe(true)
    expect(internal.getNextTrackIndex()).toBe(1)

    internal.playedOnceTrackIds.add('track-b')
    expect(internal.hasUnplayedOnceTrack()).toBe(false)
  })
})
