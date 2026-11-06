import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SoundboardSound } from '../../src/shared/types'

class FakeParam {
  value = 1
  cancelScheduledValues(): void {
    /* no scheduling in the fake */
  }
  setValueAtTime(value: number): void {
    this.value = value
  }
  linearRampToValueAtTime(value: number): void {
    this.value = value
  }
}

class FakeGain {
  gain = new FakeParam()
  connect(): void {
    /* graph wiring is irrelevant here */
  }
  disconnect(): void {
    /* graph wiring is irrelevant here */
  }
}

class FakeSource {
  buffer: unknown = null
  loop = false
  playbackRate = { value: 1 }
  stopped = false
  private listeners: (() => void)[] = []

  connect(): void {
    /* graph wiring is irrelevant here */
  }
  disconnect(): void {
    /* graph wiring is irrelevant here */
  }
  start(): void {
    /* activity is asserted through engine events */
  }
  addEventListener(event: string, listener: () => void): void {
    if (event === 'ended') this.listeners.push(listener)
  }
  stop(): void {
    if (this.stopped) return
    this.stopped = true
    for (const listener of this.listeners) listener()
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  static bufferDuration = 3
  currentTime = 0
  state = 'running'
  destination = {}
  sources: FakeSource[] = []
  gains: FakeGain[] = []

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createGain(): FakeGain {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }
  createBufferSource(): FakeSource {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  }
  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve({ duration: FakeAudioContext.bufferDuration } as AudioBuffer)
  }
  resume(): Promise<void> {
    return Promise.resolve()
  }
  close(): Promise<void> {
    this.state = 'closed'
    return Promise.resolve()
  }
}

const sound = (id: string): SoundboardSound => ({
  id,
  name: id,
  localFilePath: `/sfx/${id}.wav`,
  volume: 70,
  playbackMode: 'loop',
  order: 0,
})

let SoundboardEngine: typeof import('../../src/renderer/src/audio/SoundboardEngine').SoundboardEngine
let closeAudioContext: typeof import('../../src/renderer/src/audio/audioContext').closeAudioContext
let useAudioStore: typeof import('../../src/renderer/src/store/audioStore').useAudioStore

beforeEach(async () => {
  vi.resetModules()
  FakeAudioContext.instances.length = 0
  FakeAudioContext.bufferDuration = 3
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('window', {
    api: { registerAudioPath: () => Promise.resolve('token') },
  })
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
  )

  const contextModule = await import('../../src/renderer/src/audio/audioContext')
  closeAudioContext = contextModule.closeAudioContext
  SoundboardEngine = (await import('../../src/renderer/src/audio/SoundboardEngine'))
    .SoundboardEngine
  useAudioStore = (await import('../../src/renderer/src/store/audioStore')).useAudioStore
  useAudioStore.setState({ isBackgroundDucking: false })
})

afterEach(() => {
  SoundboardEngine.getInstance().dispose()
  closeAudioContext()
  vi.unstubAllGlobals()
})

describe('SoundboardEngine lifecycle', () => {
  it('starts release before EOF so full background level coincides with the sound ending', async () => {
    vi.useFakeTimers()
    try {
      FakeAudioContext.bufferDuration = 20
      const engine = SoundboardEngine.getInstance()
      await engine.trigger({
        ...sound('long-voice'),
        playbackMode: 'restart',
        duckBackground: true,
        duckMusicLevel: 20,
        duckAmbientLevel: 40,
        duckFadeSec: 5,
      })

      const context = FakeAudioContext.instances.at(-1)!
      const musicDuckGain = context.gains.at(-2)!
      const ambientDuckGain = context.gains.at(-1)!
      expect(musicDuckGain.gain.value).toBe(0.2)
      expect(ambientDuckGain.gain.value).toBe(0.4)
      expect(useAudioStore.getState().isBackgroundDucking).toBe(true)

      vi.advanceTimersByTime(14_999)
      expect(musicDuckGain.gain.value).toBe(0.2)
      expect(ambientDuckGain.gain.value).toBe(0.4)
      vi.advanceTimersByTime(1)
      expect(musicDuckGain.gain.value).toBe(1)
      expect(ambientDuckGain.gain.value).toBe(1)
      expect(useAudioStore.getState().isBackgroundDucking).toBe(true)

      vi.advanceTimersByTime(4_999)
      expect(useAudioStore.getState().isBackgroundDucking).toBe(true)
      vi.advanceTimersByTime(1)
      expect(useAudioStore.getState().isBackgroundDucking).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ducks the background while a configured voice is active and releases it on stop', async () => {
    const engine = SoundboardEngine.getInstance()
    await engine.trigger({
      ...sound('narration'),
      duckBackground: true,
      duckMusicLevel: 25,
      duckAmbientLevel: 60,
      duckFadeSec: 1.5,
    })

    const context = FakeAudioContext.instances.at(-1)!
    expect(context.gains.at(-2)?.gain.value).toBe(0.25)
    expect(context.gains.at(-1)?.gain.value).toBe(0.6)

    engine.stop('narration')
    expect(context.gains.at(-2)?.gain.value).toBe(1)
    expect(context.gains.at(-1)?.gain.value).toBe(1)
  })

  it('keeps the strongest duck until every overlapping request has ended', async () => {
    const engine = SoundboardEngine.getInstance()
    await engine.trigger({
      ...sound('voice-a'),
      duckBackground: true,
      duckMusicLevel: 20,
      duckAmbientLevel: 70,
      duckFadeSec: 1,
    })
    const context = FakeAudioContext.instances.at(-1)!
    const musicDuckGain = context.gains.at(-2)!
    const ambientDuckGain = context.gains.at(-1)!
    await engine.trigger({
      ...sound('voice-b'),
      duckBackground: true,
      duckMusicLevel: 55,
      duckAmbientLevel: 30,
      duckFadeSec: 1,
    })

    expect(musicDuckGain.gain.value).toBe(0.2)
    expect(ambientDuckGain.gain.value).toBe(0.3)

    engine.stop('voice-a')
    expect(musicDuckGain.gain.value).toBe(0.55)
    expect(ambientDuckGain.gain.value).toBe(0.3)

    engine.stop('voice-b')
    expect(musicDuckGain.gain.value).toBe(1)
    expect(ambientDuckGain.gain.value).toBe(1)
  })

  it('clears stale activity and rebuilds voices after an AudioContext swap', async () => {
    const engine = SoundboardEngine.getInstance()
    const activity: Array<{ id: string; playing: boolean }> = []
    engine.subscribe((id, state) => activity.push({ id, playing: state.playing }))

    await engine.trigger(sound('rain'))
    expect(activity.at(-1)).toEqual({ id: 'rain', playing: true })

    closeAudioContext()
    await engine.trigger(sound('thunder'))

    expect(FakeAudioContext.instances).toHaveLength(2)
    expect(activity).toContainEqual({ id: 'rain', playing: false })
    expect(activity.at(-1)).toEqual({ id: 'thunder', playing: true })
    expect(FakeAudioContext.instances[0].sources[0].stopped).toBe(true)
    expect(FakeAudioContext.instances[1].sources).toHaveLength(1)
  })

  it('publishes inactive state when disposed', async () => {
    const engine = SoundboardEngine.getInstance()
    const activity: boolean[] = []
    engine.subscribe((_id, state) => activity.push(state.playing))

    await engine.trigger(sound('rain'))
    engine.dispose()

    expect(activity).toEqual(expect.arrayContaining([true, false]))
  })
})
