import { getAudioContext, getAudioOutputNode, setBackgroundDuck } from './audioContext'
import { localAudioUrl } from '@/lib/localAudioUrl'
import { useAudioStore } from '@/store/audioStore'
import type { SoundboardPlaybackMode, SoundboardSound } from '@/lib/types'
import { randomPlaybackRate } from './playbackVariation'
import { SOUNDBOARD_DEFAULTS } from '@/lib/constants'

const STOP_FADE_SECONDS = 0.03
const LOOP_STOP_FADE_SECONDS = 0.4

export type SoundboardTriggerAction = 'ignore' | 'stop' | 'restart' | 'start'

export function soundboardTriggerAction(
  mode: SoundboardPlaybackMode,
  active: boolean,
  loading: boolean,
): SoundboardTriggerAction {
  if (mode === 'ignore' && (active || loading)) return 'ignore'
  if ((mode === 'stop' || mode === 'loop') && (active || loading)) return 'stop'
  if (mode === 'restart') return 'restart'
  return 'start'
}

export interface SoundboardActivity {
  playing: boolean
  voiceCount: number
  /** Wall-clock timestamp used by the renderer to animate the newest voice. */
  startedAtMs?: number
  durationMs?: number
}

type ActivityListener = (soundId: string, activity: SoundboardActivity) => void

interface Voice {
  source: AudioBufferSourceNode
  gain: GainNode
  startedAtMs: number
  durationMs?: number
  duckMusicLevel?: number
  duckAmbientLevel?: number
  duckFadeSec?: number
  duckActive?: boolean
  duckReleaseTimer?: ReturnType<typeof setTimeout>
}

/** Low-latency, polyphonic playback for campaign-wide sound effects. */
export class SoundboardEngine {
  private static instance: SoundboardEngine | null = null
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private meter: AnalyserNode | null = null
  private volumeUnsub: (() => void) | null = null
  private buffers = new Map<string, AudioBuffer>()
  private decoding = new Map<string, Promise<AudioBuffer>>()
  private voices = new Map<string, Set<Voice>>()
  private generations = new Map<string, number>()
  private pending = new Set<string>()
  private listeners = new Set<ActivityListener>()
  private duckIndicatorTimer: ReturnType<typeof setTimeout> | null = null

  static getInstance(): SoundboardEngine {
    if (!SoundboardEngine.instance) SoundboardEngine.instance = new SoundboardEngine()
    return SoundboardEngine.instance
  }

  subscribe(listener: ActivityListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getMeterAnalyser(): AnalyserNode | null {
    return this.meter
  }

  private ensureGraph(): AudioContext {
    const ctx = getAudioContext()
    if (this.ctx !== ctx) {
      this.volumeUnsub?.()
      this.volumeUnsub = null
      this.resetRuntime()
      this.masterGain?.disconnect()
      this.ctx = ctx
      this.buffers.clear()
      this.decoding.clear()
      this.masterGain = ctx.createGain()
      const audio = useAudioStore.getState()
      this.masterGain.gain.value = (audio.volume / 100) * (audio.sfxVolume / 100)
      this.meter = typeof ctx.createAnalyser === 'function' ? ctx.createAnalyser() : null
      if (this.meter) {
        this.meter.fftSize = 256
        this.meter.smoothingTimeConstant = 0.75
      }
      this.masterGain.connect(getAudioOutputNode())
      this.volumeUnsub = useAudioStore.subscribe((state, previous) => {
        if (
          (state.volume !== previous.volume || state.sfxVolume !== previous.sfxVolume) &&
          this.masterGain
        ) {
          this.masterGain.gain.setValueAtTime(
            (state.volume / 100) * (state.sfxVolume / 100),
            ctx.currentTime,
          )
        }
      })
    }
    return ctx
  }

  private async decode(sound: SoundboardSound): Promise<AudioBuffer> {
    const cached = this.buffers.get(sound.localFilePath)
    if (cached) return cached
    const pending = this.decoding.get(sound.localFilePath)
    if (pending) return pending

    const promise = (async () => {
      const ctx = this.ensureGraph()
      const token = await window.api.registerAudioPath(sound.localFilePath)
      const response = await fetch(localAudioUrl(token))
      if (!response.ok) throw new Error(`Failed to read file (HTTP ${String(response.status)})`)
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer())
      this.buffers.set(sound.localFilePath, buffer)
      return buffer
    })()
    this.decoding.set(sound.localFilePath, promise)
    try {
      return await promise
    } finally {
      this.decoding.delete(sound.localFilePath)
    }
  }

  async trigger(sound: SoundboardSound, fullVolume = false): Promise<void> {
    this.ensureGraph()
    const mode = sound.playbackMode ?? 'restart'
    const active = (this.voices.get(sound.id)?.size ?? 0) > 0
    const loading = this.pending.has(sound.id)
    const action = soundboardTriggerAction(mode, active, loading)

    if (action === 'ignore') return
    if (action === 'stop') {
      this.stop(sound.id, mode === 'loop' ? LOOP_STOP_FADE_SECONDS : STOP_FADE_SECONDS)
      return
    }

    let generation: number | null = null
    if (mode !== 'multiple') {
      generation = (this.generations.get(sound.id) ?? 0) + 1
      this.generations.set(sound.id, generation)
      this.pending.add(sound.id)
    }
    if (action === 'restart') this.stopVoices(sound.id, STOP_FADE_SECONDS)

    let buffer: AudioBuffer
    try {
      buffer = await this.decode(sound)
    } catch (error) {
      if (generation !== null && this.generations.get(sound.id) === generation) {
        this.pending.delete(sound.id)
      }
      throw error
    }
    if (generation !== null && this.generations.get(sound.id) !== generation) return
    this.pending.delete(sound.id)

    const activeCtx = this.ensureGraph()
    const source = activeCtx.createBufferSource()
    const gain = activeCtx.createGain()
    const playbackRate = randomPlaybackRate(sound.pitchVariation)
    const durationMs = mode === 'loop' ? undefined : (buffer.duration / playbackRate) * 1000
    const configuredDuckFadeSec = Math.max(
      SOUNDBOARD_DEFAULTS.minDuckFadeSec,
      Math.min(
        SOUNDBOARD_DEFAULTS.maxDuckFadeSec,
        sound.duckFadeSec ?? SOUNDBOARD_DEFAULTS.duckFadeSec,
      ),
    )
    const voice: Voice = {
      source,
      gain,
      startedAtMs: Date.now(),
      durationMs,
      ...(sound.duckBackground
        ? {
            duckMusicLevel: Math.max(
              0,
              Math.min(
                100,
                sound.duckMusicLevel ?? sound.duckLevel ?? SOUNDBOARD_DEFAULTS.duckMusicLevel,
              ),
            ),
            duckAmbientLevel: Math.max(
              0,
              Math.min(
                100,
                sound.duckAmbientLevel ?? sound.duckLevel ?? SOUNDBOARD_DEFAULTS.duckAmbientLevel,
              ),
            ),
            // A short effect still needs room for both attack and release.
            duckFadeSec:
              durationMs === undefined
                ? configuredDuckFadeSec
                : Math.min(configuredDuckFadeSec, durationMs / 2000),
            duckActive: true,
          }
        : {}),
    }
    source.buffer = buffer
    source.loop = mode === 'loop'
    source.playbackRate.value = playbackRate
    gain.gain.value = (fullVolume ? 100 : sound.volume) / 100
    source.connect(gain)
    gain.connect(this.masterGain!)
    if (this.meter) gain.connect(this.meter)

    const voices = this.voices.get(sound.id) ?? new Set<Voice>()
    voices.add(voice)
    this.voices.set(sound.id, voices)
    if (voice.duckMusicLevel !== undefined || voice.duckAmbientLevel !== undefined) {
      this.updateBackgroundDuck(voice.duckFadeSec ?? 0)
    }
    this.emitActivity(sound.id)

    source.addEventListener('ended', () => {
      if (voice.duckReleaseTimer) {
        clearTimeout(voice.duckReleaseTimer)
        voice.duckReleaseTimer = undefined
      }
      const wasActivelyDucking = voice.duckActive === true
      voice.duckActive = false
      source.disconnect()
      gain.disconnect()
      const live = this.voices.get(sound.id)
      live?.delete(voice)
      if (!live || live.size === 0) {
        this.voices.delete(sound.id)
      }
      if (wasActivelyDucking) {
        this.updateBackgroundDuck(voice.duckFadeSec ?? 0)
      }
      this.emitActivity(sound.id)
    })
    source.start()
    this.scheduleDuckRelease(sound.id, voice)
  }

  stop(soundId: string, fadeSeconds = STOP_FADE_SECONDS): void {
    this.generations.set(soundId, (this.generations.get(soundId) ?? 0) + 1)
    this.pending.delete(soundId)
    this.stopVoices(soundId, fadeSeconds)
  }

  stopAll(fadeSeconds = STOP_FADE_SECONDS): void {
    const soundIds = new Set([...this.voices.keys(), ...this.pending])
    for (const soundId of soundIds) this.stop(soundId, fadeSeconds)
  }

  dispose(): void {
    this.volumeUnsub?.()
    this.volumeUnsub = null
    this.resetRuntime()
    this.buffers.clear()
    this.decoding.clear()
    this.masterGain?.disconnect()
    this.masterGain = null
    this.meter?.disconnect()
    this.meter = null
    this.ctx = null
  }

  private resetRuntime(): void {
    const soundIds = new Set([...this.voices.keys(), ...this.pending])
    const voices = [...this.voices.values()].flatMap((entries) => [...entries])
    const hadDuckingVoice = voices.some((voice) => voice.duckActive === true)
    this.voices.clear()
    this.pending.clear()
    this.generations.clear()
    if (this.duckIndicatorTimer) {
      clearTimeout(this.duckIndicatorTimer)
      this.duckIndicatorTimer = null
    }
    useAudioStore.getState().setBackgroundDucking(false)
    if (hadDuckingVoice) setBackgroundDuck(1, 1, 0)

    for (const voice of voices) {
      if (voice.duckReleaseTimer) clearTimeout(voice.duckReleaseTimer)
      voice.duckReleaseTimer = undefined
      voice.duckActive = false
      try {
        voice.source.stop()
      } catch {
        // A source owned by a closed AudioContext may already be unusable.
      }
      voice.source.disconnect()
      voice.gain.disconnect()
    }
    for (const soundId of soundIds) this.emitActivity(soundId)
  }

  /** Begin release early enough for the background to be fully restored at EOF. */
  private scheduleDuckRelease(soundId: string, voice: Voice): void {
    if (voice.duckActive !== true || voice.durationMs === undefined) return
    const fadeMs = (voice.duckFadeSec ?? 0) * 1000
    const releaseDelayMs = Math.max(0, voice.durationMs - fadeMs)
    voice.duckReleaseTimer = setTimeout(() => {
      voice.duckReleaseTimer = undefined
      const live = this.voices.get(soundId)
      if (!live?.has(voice) || voice.duckActive !== true) return
      voice.duckActive = false
      this.updateBackgroundDuck(voice.duckFadeSec ?? 0)
    }, releaseDelayMs)
  }

  private stopVoices(soundId: string, fadeSeconds: number): void {
    const voices = this.voices.get(soundId)
    if (!voices || voices.size === 0 || !this.ctx) return
    const now = this.ctx.currentTime
    for (const voice of voices) {
      voice.gain.gain.cancelScheduledValues(now)
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now)
      voice.gain.gain.linearRampToValueAtTime(0, now + fadeSeconds)
      voice.source.stop(now + fadeSeconds)
    }
  }

  /** The strongest active request wins; release only after the final voice ends. */
  private updateBackgroundDuck(fadeSec: number): void {
    let musicLevel = 100
    let ambientLevel = 100
    let hasActiveRequest = false
    for (const voices of this.voices.values()) {
      for (const voice of voices) {
        if (voice.duckActive === true) {
          hasActiveRequest = true
          musicLevel = Math.min(musicLevel, voice.duckMusicLevel ?? 100)
          ambientLevel = Math.min(ambientLevel, voice.duckAmbientLevel ?? 100)
        }
      }
    }
    setBackgroundDuck(musicLevel / 100, ambientLevel / 100, fadeSec)

    if (this.duckIndicatorTimer) {
      clearTimeout(this.duckIndicatorTimer)
      this.duckIndicatorTimer = null
    }
    if (hasActiveRequest) {
      useAudioStore.getState().setBackgroundDucking(true)
    } else if (fadeSec <= 0) {
      useAudioStore.getState().setBackgroundDucking(false)
    } else {
      this.duckIndicatorTimer = setTimeout(() => {
        this.duckIndicatorTimer = null
        useAudioStore.getState().setBackgroundDucking(false)
      }, fadeSec * 1000)
    }
  }

  private emitActivity(soundId: string): void {
    const voices = this.voices.get(soundId)
    if (!voices || voices.size === 0) {
      for (const listener of this.listeners) {
        listener(soundId, { playing: false, voiceCount: 0 })
      }
      return
    }

    const newest = [...voices].reduce((latest, voice) =>
      voice.startedAtMs > latest.startedAtMs ? voice : latest,
    )
    const activity: SoundboardActivity = {
      playing: true,
      voiceCount: voices.size,
      startedAtMs: newest.startedAtMs,
      durationMs: newest.durationMs,
    }
    for (const listener of this.listeners) listener(soundId, activity)
  }
}
