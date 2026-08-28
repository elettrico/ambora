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
  currentTime = 0
  state = 'running'
  destination = {}
  sources: FakeSource[] = []

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createGain(): FakeGain {
    return new FakeGain()
  }
  createBufferSource(): FakeSource {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  }
  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve({ duration: 3 } as AudioBuffer)
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

beforeEach(async () => {
  vi.resetModules()
  FakeAudioContext.instances.length = 0
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
})

afterEach(() => {
  SoundboardEngine.getInstance().dispose()
  closeAudioContext()
  vi.unstubAllGlobals()
})

describe('SoundboardEngine lifecycle', () => {
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
