import { getAudioContext } from './audioContext'
import { localAudioUrl } from '@/lib/localAudioUrl'
import { useAudioStore } from '@/store/audioStore'
import type { SoundboardSound } from '@/lib/types'

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
  durationMs: number
}

/** Low-latency, polyphonic playback for campaign-wide one-shot effects. */
export class SoundboardEngine {
  private static instance: SoundboardEngine | null = null
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private volumeUnsub: (() => void) | null = null
  private buffers = new Map<string, AudioBuffer>()
  private decoding = new Map<string, Promise<AudioBuffer>>()
  private voices = new Map<string, Set<Voice>>()
  private generations = new Map<string, number>()
  private pending = new Set<string>()
  private listeners = new Set<ActivityListener>()

  static getInstance(): SoundboardEngine {
    if (!SoundboardEngine.instance) SoundboardEngine.instance = new SoundboardEngine()
    return SoundboardEngine.instance
  }

  subscribe(listener: ActivityListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private ensureGraph(): AudioContext {
    const ctx = getAudioContext()
    if (this.ctx !== ctx) {
      this.volumeUnsub?.()
      this.ctx = ctx
      this.buffers.clear()
      this.decoding.clear()
      this.masterGain = ctx.createGain()
      this.masterGain.gain.value = useAudioStore.getState().volume / 100
      this.masterGain.connect(ctx.destination)
      this.volumeUnsub = useAudioStore.subscribe((state, previous) => {
        if (state.volume !== previous.volume && this.masterGain) {
          this.masterGain.gain.setValueAtTime(state.volume / 100, ctx.currentTime)
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
    const ctx = this.ensureGraph()
    const mode = sound.playbackMode ?? 'restart'
    const active = (this.voices.get(sound.id)?.size ?? 0) > 0
    const loading = this.pending.has(sound.id)

    if (mode === 'ignore' && (active || loading)) return
    if (mode === 'stop' && (active || loading)) {
      this.generations.set(sound.id, (this.generations.get(sound.id) ?? 0) + 1)
      this.pending.delete(sound.id)
      this.stopVoices(sound.id)
      return
    }

    let generation: number | null = null
    if (mode !== 'multiple') {
      generation = (this.generations.get(sound.id) ?? 0) + 1
      this.generations.set(sound.id, generation)
      this.pending.add(sound.id)
    }
    if (mode === 'restart') this.stopVoices(sound.id)

    const buffer = await this.decode(sound)
    if (generation !== null && this.generations.get(sound.id) !== generation) return
    this.pending.delete(sound.id)

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    const voice: Voice = {
      source,
      gain,
      startedAtMs: Date.now(),
      durationMs: buffer.duration * 1000,
    }
    source.buffer = buffer
    gain.gain.value = (fullVolume ? 100 : sound.volume) / 100
    source.connect(gain)
    gain.connect(this.masterGain!)

    const voices = this.voices.get(sound.id) ?? new Set<Voice>()
    voices.add(voice)
    this.voices.set(sound.id, voices)
    this.emitActivity(sound.id)

    source.addEventListener('ended', () => {
      source.disconnect()
      gain.disconnect()
      const live = this.voices.get(sound.id)
      live?.delete(voice)
      if (!live || live.size === 0) {
        this.voices.delete(sound.id)
      }
      this.emitActivity(sound.id)
    })
    source.start()
  }

  private stopVoices(soundId: string): void {
    const voices = this.voices.get(soundId)
    if (!voices || voices.size === 0 || !this.ctx) return
    const now = this.ctx.currentTime
    for (const voice of voices) {
      voice.gain.gain.cancelScheduledValues(now)
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now)
      voice.gain.gain.linearRampToValueAtTime(0, now + 0.03)
      voice.source.stop(now + 0.03)
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
