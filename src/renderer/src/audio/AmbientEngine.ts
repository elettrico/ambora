import { getAudioContext } from './audioContext'
import { localAudioUrl } from '@/lib/localAudioUrl'
import { AmbientClipSelector, nextDelaySec, sortedClips } from './ambientScheduling'
import { audioLog, extOf } from './audioLog'
import { useAudioStore } from '@/store/audioStore'
import { useDiagnosticsStore } from '@/store/diagnosticsStore'
import { AMBIENT_DEFAULTS } from '@/lib/constants'
import type { AmbientClip, AmbientLayer, AmbientLayerRuntime, Climate } from '@/lib/types'
import { randomPlaybackRate } from './playbackVariation'

/**
 * Plays a climate's ambient layers alongside — and completely independently of —
 * the music engine's dual-channel crossfade.
 *
 * Graph:
 *
 *   clip file ──decoded once──▶ AudioBuffer cache
 *                                     │
 *                   AudioBufferSourceNode (one per trigger)
 *                                     │
 *                                layer gain ── layer volume × enabled
 *                                     │
 *                                stack gain ── scene fade (one per activation)
 *                                     │
 *                               master gain ── master volume
 *                                     │
 *                                 destination
 *
 * A "stack" is one climate's live set of layers. Switching climates builds a new
 * stack fading in while the old one fades out, so ambient rides the same
 * crossfade as the music rather than cutting.
 *
 * Clips are decoded to AudioBuffers once and cached, which is what makes a
 * one-shot fire the instant the GM taps it.
 */

/**
 * One playing clip. The per-voice gain exists so a voice can be faded out on its
 * own — stopping a buffer source outright clicks.
 */
interface Playback {
  source: AudioBufferSourceNode
  gain: GainNode
}

interface SequenceClip {
  buffer: AudioBuffer
  playbackRate: number
}

interface LiveLayer {
  layer: AmbientLayer
  gain: GainNode
  selector: AmbientClipSelector
  /**
   * Voices currently playing for this layer. The engine holds this to at most
   * one — a layer must never talk over itself.
   */
  sources: Set<Playback>
  /** Held across fireRandom's await so two fires can't interleave. */
  firing: boolean
  timer: ReturnType<typeof setTimeout> | null
  /** Guards against two concurrent loop starts racing past the "already looping" check. */
  loopStarting: boolean
  /**
   * True until this layer has fired once in the current stack. The first delay is
   * drawn from [0, min] so a scene sounds alive immediately.
   */
  isFirstFire: boolean
  enabled: boolean
  volume: number
  /** Mode + clip set. A change here means the layer must be re-armed. */
  structuralKey: string
  /** Invalidates an in-flight sequence when it is retriggered or stopped. */
  sequenceRun: number
  /** Defers a manual fade-in until async decoding has produced the first voice. */
  activationFadePending: boolean
}

interface Stack {
  climateId: string
  gain: GainNode
  layers: Map<string, LiveLayer>
  /** False while paused/fading out — scheduling and playback are suspended. */
  running: boolean
  disposed: boolean
}

/** Fade applied to an outgoing voice when a retrigger cuts it short. */
const CHOKE_FADE_SEC = 0.06

function structuralKeyOf(layer: AmbientLayer): string {
  return [layer.mode, ...sortedClips(layer).map((c) => `${c.id}:${c.localFilePath}`)].join('|')
}

function sameRuntime(
  a: Record<string, AmbientLayerRuntime>,
  b: Record<string, AmbientLayerRuntime>,
): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  for (const key of aKeys) {
    const left = a[key]
    const right = b[key]
    if (!right) return false
    if (
      left.enabled !== right.enabled ||
      left.volume !== right.volume ||
      left.triggeredAt !== right.triggeredAt ||
      left.sounding !== right.sounding ||
      left.playbackStartedAt !== right.playbackStartedAt ||
      left.playbackDurationMs !== right.playbackDurationMs
    ) {
      return false
    }
  }
  return true
}

function runtimeDefaults(layers: readonly AmbientLayer[]): Record<string, AmbientLayerRuntime> {
  const runtime: Record<string, AmbientLayerRuntime> = {}
  for (const layer of layers) {
    runtime[layer.id] = { enabled: layer.enabled, volume: layer.volume }
  }
  return runtime
}

/** A sequence contains every clip exactly once; the pick mode only orders the run. */
function sequenceClips(
  clips: readonly AmbientClip[],
  layer: AmbientLayer,
  selector: AmbientClipSelector,
): AmbientClip[] {
  if (layer.clipOrder === 'sequential') return [...clips]
  if (layer.clipOrder === 'shuffle') {
    return Array.from({ length: clips.length }, () => clips[selector.next(clips, 'shuffle')])
  }
  const randomized = [...clips]
  for (let i = randomized.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[randomized[i], randomized[j]] = [randomized[j], randomized[i]]
  }
  return randomized
}

export class AmbientEngine {
  private static instance: AmbientEngine | null = null

  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private auditionGain: GainNode | null = null
  private stack: Stack | null = null

  private bufferCache = new Map<string, AudioBuffer>()
  private decoding = new Map<string, Promise<AudioBuffer | null>>()
  /** Cap parallel full-file decodes so climate switches don't spike CPU/memory. */
  private decodeInFlight = 0
  private decodeWaiters: Array<() => void> = []
  private volumeUnsub: (() => void) | null = null

  private auditionSource: AudioBufferSourceNode | null = null
  private auditionRun = 0
  private onClipDuration: ((localFilePath: string, duration: number) => void) | null = null

  private static readonly MAX_PARALLEL_DECODES = 2

  private async acquireDecodeSlot(): Promise<void> {
    if (this.decodeInFlight < AmbientEngine.MAX_PARALLEL_DECODES) {
      this.decodeInFlight++
      return
    }
    await new Promise<void>((resolve) => {
      this.decodeWaiters.push(() => {
        this.decodeInFlight++
        resolve()
      })
    })
  }

  private releaseDecodeSlot(): void {
    this.decodeInFlight = Math.max(0, this.decodeInFlight - 1)
    const next = this.decodeWaiters.shift()
    if (next) next()
  }

  static getInstance(): AmbientEngine {
    if (!AmbientEngine.instance) {
      AmbientEngine.instance = new AmbientEngine()
    }
    return AmbientEngine.instance
  }

  /** Reports a clip's true length, keyed by file path, once it has been decoded. */
  setOnClipDurationAvailable(callback: (localFilePath: string, duration: number) => void): void {
    this.onClipDuration = callback
  }

  // ── Graph setup ──────────────────────────────────────────────────────────

  private ensureGraph(): AudioContext {
    const ctx = getAudioContext()

    if (this.ctx !== ctx) {
      // First use, or the context was closed and rebuilt. Anything graphed into
      // the old context is dead — drop it rather than leaving dangling nodes.
      this.teardownStack(this.stack)
      this.stack = null
      this.bufferCache.clear()
      this.decoding.clear()
      this.auditionSource = null

      this.ctx = ctx
      this.masterGain = ctx.createGain()
      this.masterGain.gain.value = this.masterVolume01()
      this.masterGain.connect(ctx.destination)

      this.auditionGain = ctx.createGain()
      this.auditionGain.gain.value = 1
      this.auditionGain.connect(this.masterGain)

      this.subscribeToVolume()
    }

    return ctx
  }

  private masterVolume01(): number {
    const { volume, ambientVolume } = useAudioStore.getState()
    return (volume / 100) * (ambientVolume / 100)
  }

  private subscribeToVolume(): void {
    this.volumeUnsub?.()
    this.volumeUnsub = useAudioStore.subscribe((state, prev) => {
      if (
        (state.volume !== prev.volume || state.ambientVolume !== prev.ambientVolume) &&
        this.masterGain
      ) {
        this.ramp(this.masterGain.gain, this.masterVolume01(), 0)
      }
    })
  }

  private ramp(param: AudioParam, target: number, durationSec: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    param.cancelScheduledValues(now)
    param.setValueAtTime(param.value, now)
    if (durationSec <= 0) {
      param.setValueAtTime(target, now)
    } else {
      param.linearRampToValueAtTime(target, now + durationSec)
    }
  }

  // ── Clip decoding ────────────────────────────────────────────────────────

  private async getBuffer(clip: AmbientClip): Promise<AudioBuffer | null> {
    // Imported clips carry a title but no path — the file lived on the exporting
    // machine. Fail per clip here rather than letting them all collide on the
    // empty-string cache key.
    if (!clip.localFilePath) {
      useDiagnosticsStore.getState().setUnplayable(clip.id, {
        source: 'playback',
        reason: 'This clip has no audio file yet — re-add it after importing',
      })
      return null
    }

    const cached = this.bufferCache.get(clip.localFilePath)
    if (cached) return cached

    const inflight = this.decoding.get(clip.localFilePath)
    if (inflight) return inflight

    const decode = this.decodeClip(clip)
    this.decoding.set(clip.localFilePath, decode)
    return decode
  }

  private async decodeClip(clip: AmbientClip): Promise<AudioBuffer | null> {
    await this.acquireDecodeSlot()
    try {
      const ctx = this.ensureGraph()
      const token = await window.api.registerAudioPath(clip.localFilePath)
      const response = await fetch(localAudioUrl(token))
      if (!response.ok) {
        throw new Error(`Failed to read file (HTTP ${String(response.status)})`)
      }
      const bytes = await response.arrayBuffer()
      const buffer = await ctx.decodeAudioData(bytes)
      this.bufferCache.set(clip.localFilePath, buffer)
      useDiagnosticsStore.getState().clearUnplayable(clip.id)
      // The decoded buffer is the authoritative length. The metadata probe at add
      // time can come back empty (a VBR MP3 with no Xing header reports Infinity),
      // so this backfills anything that got stored without a duration.
      this.onClipDuration?.(clip.localFilePath, buffer.duration)
      return buffer
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Could not decode audio file'
      useDiagnosticsStore.getState().setUnplayable(clip.id, { source: 'playback', reason })
      audioLog('ambient', 'decode-failed', {
        trackId: clip.id,
        title: clip.title,
        localFilePath: clip.localFilePath,
        ext: extOf(clip.localFilePath),
        detail: reason,
      })
      return null
    } finally {
      this.decoding.delete(clip.localFilePath)
      this.releaseDecodeSlot()
    }
  }

  /**
   * Warm the cache for a climate so the first trigger isn't gated on file I/O.
   * Decodes are concurrency-limited; we only kick off enabled layers up front
   * (disabled layers decode on first enable / audition).
   */
  private preload(layers: readonly AmbientLayer[]): void {
    for (const layer of layers) {
      if (!layer.enabled) continue
      for (const clip of layer.clips) {
        if (!this.bufferCache.has(clip.localFilePath)) {
          void this.getBuffer(clip)
        }
      }
    }
  }

  // ── Stack lifecycle ──────────────────────────────────────────────────────

  /**
   * Bring up `climate`'s ambient layers over `fadeSec`, retiring whatever was
   * playing over the same window. Safe to call for a climate with no layers —
   * it just tears the previous stack down.
   */
  startClimate(climate: Climate, fadeSec: number): void {
    // Editor previews live outside the scene stack. A real scene activation is
    // authoritative and must cancel both an active preview and a decode that
    // has not started playing yet.
    this.stopAudition()

    const layers = climate.ambientLayers ?? []

    this.retireStack(this.stack, fadeSec)
    this.stack = null

    useAudioStore.getState().setAmbientRuntime(runtimeDefaults(layers))

    if (layers.length === 0) return

    const ctx = this.ensureGraph()
    const stackGain = ctx.createGain()
    stackGain.gain.value = 0
    stackGain.connect(this.masterGain!)

    const stack: Stack = {
      climateId: climate.id,
      gain: stackGain,
      layers: new Map(),
      running: true,
      disposed: false,
    }

    for (const layer of [...layers].sort((a, b) => a.order - b.order)) {
      stack.layers.set(layer.id, this.createLiveLayer(stack, layer))
    }

    this.stack = stack
    this.ramp(stackGain.gain, 1, fadeSec)
    this.preload(layers)

    for (const live of stack.layers.values()) {
      this.armLayer(stack, live)
    }

    audioLog('ambient', 'climate-started', {
      trackId: climate.id,
      title: climate.name,
      trackCount: layers.length,
    })
  }

  private createLiveLayer(stack: Stack, layer: AmbientLayer): LiveLayer {
    const gain = this.ctx!.createGain()
    gain.gain.value = layer.enabled ? layer.volume / 100 : 0
    gain.connect(stack.gain)

    return {
      layer,
      gain,
      selector: new AmbientClipSelector(),
      sources: new Set(),
      timer: null,
      loopStarting: false,
      firing: false,
      isFirstFire: true,
      enabled: layer.enabled,
      volume: layer.volume,
      structuralKey: structuralKeyOf(layer),
      sequenceRun: 0,
      activationFadePending: false,
    }
  }

  private retireStack(stack: Stack | null, fadeSec: number): void {
    if (!stack || stack.disposed) return
    stack.running = false
    for (const live of stack.layers.values()) {
      this.clearTimer(live)
    }
    this.ramp(stack.gain.gain, 0, fadeSec)
    // Let the fade finish before cutting the sources, otherwise the tail clicks.
    setTimeout(() => this.teardownStack(stack), Math.max(0, fadeSec) * 1000 + 100)
  }

  private teardownStack(stack: Stack | null): void {
    if (!stack || stack.disposed) return
    stack.disposed = true
    for (const live of stack.layers.values()) {
      this.clearTimer(live)
      this.stopLayerSources(live)
      live.gain.disconnect()
    }
    stack.layers.clear()
    stack.gain.disconnect()
  }

  /** Full stop — used when the music engine goes idle. */
  stop(fadeSec = 0): void {
    this.retireStack(this.stack, fadeSec)
    this.stack = null
    useAudioStore.getState().setAmbientRuntime({})
  }

  /** Pause: hold the stack but silence and unschedule it (fade-to-silence). */
  fadeOut(fadeSec: number): void {
    const stack = this.stack
    if (!stack || stack.disposed || !stack.running) return
    stack.running = false
    for (const live of stack.layers.values()) {
      this.clearTimer(live)
    }
    this.ramp(stack.gain.gain, 0, fadeSec)
    setTimeout(
      () => {
        if (stack.disposed || stack.running) return
        for (const live of stack.layers.values()) {
          this.stopLayerSources(live)
        }
      },
      Math.max(0, fadeSec) * 1000 + 100,
    )
  }

  /** Resume after fadeOut: re-arm every enabled layer and fade the stack back in. */
  fadeIn(fadeSec: number): void {
    const stack = this.stack
    if (!stack || stack.disposed || stack.running) return
    stack.running = true
    this.ramp(stack.gain.gain, 1, fadeSec)
    for (const live of stack.layers.values()) {
      live.isFirstFire = true
      this.armLayer(stack, live)
    }
  }

  // ── Live editing ─────────────────────────────────────────────────────────

  /**
   * Reconcile the running stack with an edited climate, so changes made in the
   * desktop editor take effect on the scene the GM is currently listening to.
   *
   * Only a mode or clip-set change re-arms a layer (restarting a loop is
   * audible); delay and clip-order edits are picked up by the next schedule.
   */
  syncClimate(climate: Climate): void {
    const stack = this.stack
    if (!stack || stack.disposed || stack.climateId !== climate.id) return

    const layers = [...(climate.ambientLayers ?? [])].sort((a, b) => a.order - b.order)
    const seen = new Set<string>()
    const store = useAudioStore.getState()
    const runtime: Record<string, AmbientLayerRuntime> = {}

    for (const layer of layers) {
      seen.add(layer.id)
      const existing = stack.layers.get(layer.id)

      if (!existing) {
        const live = this.createLiveLayer(stack, layer)
        stack.layers.set(layer.id, live)
        runtime[layer.id] = { enabled: layer.enabled, volume: layer.volume }
        this.preload([layer])
        this.armLayer(stack, live)
        continue
      }

      const previousRuntime = store.ambientRuntime[layer.id]
      runtime[layer.id] = previousRuntime ?? { enabled: layer.enabled, volume: layer.volume }

      const nextKey = structuralKeyOf(layer)
      existing.layer = layer
      if (nextKey !== existing.structuralKey) {
        existing.structuralKey = nextKey
        existing.selector.reset()
        this.clearTimer(existing)
        this.stopLayerSources(existing)
        existing.isFirstFire = true
        this.armLayer(stack, existing)
      }
    }

    for (const [layerId, live] of [...stack.layers]) {
      if (seen.has(layerId)) continue
      this.clearTimer(live)
      this.stopLayerSources(live)
      live.gain.disconnect()
      stack.layers.delete(layerId)
    }

    // syncClimate runs on every campaign edit anywhere in the app. Only publish a
    // new runtime map when it actually differs, or each unrelated edit would push
    // a fresh object and a full-state broadcast to the phone.
    if (!sameRuntime(store.ambientRuntime, runtime)) {
      store.setAmbientRuntime(runtime)
    }
  }

  // ── Runtime controls ─────────────────────────────────────────────────────

  setLayerEnabled(layerId: string, enabled: boolean): void {
    useAudioStore.getState().setAmbientLayerEnabled(layerId, enabled)

    const stack = this.stack
    const live = stack?.layers.get(layerId)
    if (!stack || !live) return

    live.enabled = enabled
    const usesActivationFade = live.layer.mode === 'loop' || live.layer.mode === 'random'
    const fade = usesActivationFade
      ? (live.layer.activationFadeSec ?? AMBIENT_DEFAULTS.activationFadeSec)
      : AMBIENT_DEFAULTS.toggleFadeSec

    if (enabled) {
      if (usesActivationFade && live.sources.size === 0) {
        // Loading and decoding are asynchronous. Hold the layer silent until its
        // first voice really starts, otherwise the fade can finish before any
        // audio exists and the clip enters at full level.
        this.ramp(live.gain.gain, 0, 0)
        live.activationFadePending = true
      } else {
        live.activationFadePending = false
        this.ramp(live.gain.gain, live.volume / 100, fade)
      }
      live.isFirstFire = true
      this.armLayer(stack, live)
    } else {
      live.activationFadePending = false
      this.ramp(live.gain.gain, 0, fade)
      this.clearTimer(live)
      setTimeout(
        () => {
          if (!live.enabled) this.stopLayerSources(live)
        },
        fade * 1000 + 50,
      )
    }
  }

  setLayerVolume(layerId: string, volume: number): void {
    const clamped = Math.max(0, Math.min(100, volume))
    useAudioStore.getState().setAmbientLayerVolume(layerId, clamped)

    const live = this.stack?.layers.get(layerId)
    if (!live) return
    live.volume = clamped
    if (live.enabled) {
      this.ramp(live.gain.gain, clamped / 100, 0)
    }
  }

  /** Fire a one-shot or sequence layer. No-op when disabled or empty. */
  triggerLayer(layerId: string): void {
    const stack = this.stack
    const live = stack?.layers.get(layerId)
    if (!stack || !live || !stack.running) return

    // One-shots are explicit controls. If this layer was initially disabled,
    // pressing its climate-card button is also the user's request to enable it
    // for the current session. Without this, the button was visible but could
    // never be used from the grid.
    if (!live.enabled) {
      if (live.layer.mode !== 'oneshot' && live.layer.mode !== 'sequence') return
      this.setLayerEnabled(layerId, true)
    }

    const clips = sortedClips(live.layer)
    if (clips.length === 0) return

    useAudioStore.getState().markAmbientLayerTriggered(layerId)

    if (live.layer.mode === 'sequence') {
      void this.triggerSequence(stack, live, clips)
      return
    }

    const clip = clips[live.selector.next(clips, live.layer.clipOrder)]
    void this.getBuffer(clip).then((buffer) => {
      if (!buffer || stack.disposed || !stack.running || !live.enabled) return
      this.playClip(live, buffer, false)
    })
  }

  private async triggerSequence(
    stack: Stack,
    live: LiveLayer,
    clips: readonly AmbientClip[],
  ): Promise<void> {
    const run = ++live.sequenceRun
    this.chokeLayer(live)

    const ordered = sequenceClips(clips, live.layer, live.selector)
    const decoded = await Promise.all(
      ordered.map(async (clip): Promise<SequenceClip | null> => {
        const buffer = await this.getBuffer(clip)
        if (!buffer) return null
        return { buffer, playbackRate: randomPlaybackRate(live.layer.pitchVariation) }
      }),
    )
    const playable = decoded.filter((clip): clip is SequenceClip => clip !== null)
    if (
      playable.length === 0 ||
      run !== live.sequenceRun ||
      stack.disposed ||
      !stack.running ||
      !live.enabled
    ) {
      return
    }

    const durationMs =
      playable.reduce((total, clip) => total + clip.buffer.duration / clip.playbackRate, 0) * 1000
    useAudioStore.getState().setAmbientLayerProgress(live.layer.id, Date.now(), durationMs)

    const playNext = (index: number): void => {
      if (
        index >= playable.length ||
        run !== live.sequenceRun ||
        stack.disposed ||
        !stack.running ||
        !live.enabled
      ) {
        return
      }
      const clip = playable[index]
      const { source } = this.playClip(live, clip.buffer, false, clip.playbackRate, false)
      source.addEventListener('ended', () => playNext(index + 1))
    }
    playNext(0)
  }

  // ── Editor audition ──────────────────────────────────────────────────────

  /**
   * Play one clip from `layer` at its configured volume, independently of
   * whatever scene is live, so the GM can audition while editing. Loop layers
   * audition as a single pass — stoppable via {@link stopAudition}.
   */
  async auditionLayer(layer: AmbientLayer): Promise<void> {
    this.stopAudition()

    const clips = sortedClips(layer)
    if (clips.length === 0) return

    // Create/resume the graph while this method is still running directly from
    // the user's click. Waiting for file I/O first can lose the browser's user
    // activation and leave a suspended AudioContext silent on some platforms.
    const ctx = this.ensureGraph()
    const run = this.auditionRun
    useAudioStore.getState().setAuditioningLayerId(layer.id)

    if (layer.mode === 'sequence') {
      const selector = new AmbientClipSelector()
      const ordered = sequenceClips(clips, layer, selector)
      const buffers = await Promise.all(ordered.map((clip) => this.getBuffer(clip)))
      if (run !== this.auditionRun) return
      const playable = buffers.filter((buffer): buffer is AudioBuffer => buffer !== null)
      if (playable.length === 0) {
        useAudioStore.getState().setAuditioningLayerId(null)
        return
      }
      this.playAuditionSequence(layer, playable, 0, run)
      return
    }

    const clip = clips[Math.floor(Math.random() * clips.length)]
    const buffer = await this.getBuffer(clip)
    // A second click or a different layer may have cancelled this load while
    // it was decoding. Never let the stale request start afterwards.
    if (run !== this.auditionRun) return
    if (!buffer) {
      useAudioStore.getState().setAuditioningLayerId(null)
      return
    }

    const gain = ctx.createGain()
    gain.gain.value = layer.volume / 100
    gain.connect(this.auditionGain!)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = randomPlaybackRate(layer.pitchVariation)
    source.connect(gain)
    source.addEventListener('ended', () => {
      gain.disconnect()
      source.disconnect()
      if (this.auditionSource === source) {
        this.auditionSource = null
        useAudioStore.getState().setAuditioningLayerId(null)
      }
    })

    this.auditionSource = source
    source.start()
  }

  stopAudition(): void {
    this.auditionRun++
    const source = this.auditionSource
    this.auditionSource = null
    useAudioStore.getState().setAuditioningLayerId(null)
    if (!source) return
    try {
      source.stop()
    } catch {
      // Already stopped — nothing to do.
    }
  }

  private playAuditionSequence(
    layer: AmbientLayer,
    buffers: readonly AudioBuffer[],
    index: number,
    run: number,
  ): void {
    if (run !== this.auditionRun || index >= buffers.length) {
      if (run === this.auditionRun) useAudioStore.getState().setAuditioningLayerId(null)
      return
    }
    const ctx = this.ensureGraph()
    const gain = ctx.createGain()
    gain.gain.value = layer.volume / 100
    gain.connect(this.auditionGain!)
    const source = ctx.createBufferSource()
    source.buffer = buffers[index]
    source.playbackRate.value = randomPlaybackRate(layer.pitchVariation)
    source.connect(gain)
    source.addEventListener('ended', () => {
      source.disconnect()
      gain.disconnect()
      if (this.auditionSource === source) this.auditionSource = null
      this.playAuditionSequence(layer, buffers, index + 1, run)
    })
    this.auditionSource = source
    source.start()
  }

  // ── Scheduling ───────────────────────────────────────────────────────────

  private armLayer(stack: Stack, live: LiveLayer): void {
    if (!stack.running || !live.enabled) return
    if (live.layer.clips.length === 0) return

    switch (live.layer.mode) {
      case 'loop':
        void this.startLoop(stack, live)
        break
      case 'random':
        // A voice is still playing — don't schedule on top of it. Its own `ended`
        // handler continues the chain, keeping the delay measured from the end of
        // the current clip. Without this, re-enabling a layer (or resuming) while
        // a clip is still sounding queues a second, overlapping fire.
        if (live.sources.size > 0) return
        this.scheduleNext(stack, live)
        break
      case 'oneshot':
      case 'sequence':
        // Fires only when the GM triggers it.
        break
    }
  }

  private async startLoop(stack: Stack, live: LiveLayer): Promise<void> {
    if (!stack.running || !live.enabled || live.loopStarting || live.sources.size > 0) return
    live.loopStarting = true
    try {
      const clips = sortedClips(live.layer)
      if (clips.length === 0) return
      // Multi-clip loop layers pick one variant per activation.
      const clip = clips[live.selector.next(clips, live.layer.clipOrder)]
      const buffer = await this.getBuffer(clip)
      if (!buffer || stack.disposed || !stack.running || !live.enabled) return
      if (live.sources.size > 0) return
      this.playClip(live, buffer, true)
    } finally {
      live.loopStarting = false
    }
  }

  private scheduleNext(stack: Stack, live: LiveLayer): void {
    if (!stack.running || !live.enabled) return
    this.clearTimer(live)

    const delaySec = nextDelaySec(live.layer, live.isFirstFire)
    live.isFirstFire = false
    live.timer = setTimeout(() => {
      live.timer = null
      void this.fireRandom(stack, live)
    }, delaySec * 1000)
  }

  private async fireRandom(stack: Stack, live: LiveLayer): Promise<void> {
    if (!stack.running || !live.enabled || live.firing) return
    // Something is still sounding (a slow decode, or a re-arm raced us). Wait for
    // it to finish rather than stacking a second voice on top.
    if (live.sources.size > 0) return

    const clips = sortedClips(live.layer)
    if (clips.length === 0) return

    live.firing = true
    try {
      const clip = clips[live.selector.next(clips, live.layer.clipOrder)]
      const buffer = await this.getBuffer(clip)
      if (stack.disposed || !stack.running || !live.enabled) return

      if (!buffer) {
        // One bad file shouldn't silence the whole layer for the rest of the scene.
        this.scheduleNext(stack, live)
        return
      }

      // Decoding is async, so re-check: a voice may have started while we waited.
      if (live.sources.size > 0) {
        this.scheduleNext(stack, live)
        return
      }

      const { source } = this.playClip(live, buffer, false)
      // The next delay is measured from when this clip finishes, so the layer
      // never overlaps itself — the behaviour the RFC asked for.
      source.addEventListener('ended', () => this.scheduleNext(stack, live))
    } finally {
      live.firing = false
    }
  }

  /**
   * Starts a voice, first silencing any voice already playing on this layer.
   * One layer is one sound source — overlapping a layer with itself turns
   * "a raven" into a flock and makes level control meaningless.
   */
  private playClip(
    live: LiveLayer,
    buffer: AudioBuffer,
    loop: boolean,
    playbackRate = randomPlaybackRate(live.layer.pitchVariation),
    publishProgress = true,
  ): Playback {
    if (live.sources.size > 0) this.chokeLayer(live)

    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.value = 1
    gain.connect(live.gain)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    source.playbackRate.value = playbackRate
    source.connect(gain)

    const playback: Playback = { source, gain }
    live.sources.add(playback)

    source.addEventListener('ended', () => {
      live.sources.delete(playback)
      source.disconnect()
      gain.disconnect()
      if (live.sources.size === 0) this.setSounding(live, false)
    })

    source.start()
    if (
      live.activationFadePending &&
      (live.layer.mode === 'loop' || live.layer.mode === 'random')
    ) {
      live.activationFadePending = false
      this.ramp(
        live.gain.gain,
        live.volume / 100,
        live.layer.activationFadeSec ?? AMBIENT_DEFAULTS.activationFadeSec,
      )
    }
    this.setSounding(live, true)
    if (!loop && publishProgress) {
      useAudioStore
        .getState()
        .setAmbientLayerProgress(live.layer.id, Date.now(), (buffer.duration / playbackRate) * 1000)
    }
    return playback
  }

  /**
   * Fades out and stops every voice on a layer. Used when a retrigger arrives
   * while the layer is still sounding — a hard stop would click.
   */
  private chokeLayer(live: LiveLayer, fadeSec = CHOKE_FADE_SEC): void {
    for (const playback of [...live.sources]) {
      // Drop it from the set immediately so `sources.size` reflects the layer's
      // logical state rather than waiting on the fade.
      live.sources.delete(playback)
      this.ramp(playback.gain.gain, 0, fadeSec)
      const { source, gain } = playback
      setTimeout(
        () => {
          try {
            source.stop()
          } catch {
            // Already ended on its own.
          }
          source.disconnect()
          gain.disconnect()
        },
        fadeSec * 1000 + 20,
      )
    }
    // The voices have been removed from the layer immediately. Publish that
    // logical state now instead of waiting for a delayed `ended` event, which
    // left the UI claiming the layer was sounding during a decode/retrigger gap.
    if (live.sources.size === 0) this.setSounding(live, false)
  }

  /** Publishes "this layer has audio playing right now" for the UI indicators. */
  private setSounding(live: LiveLayer, sounding: boolean): void {
    useAudioStore.getState().setAmbientLayerSounding(live.layer.id, sounding)
  }

  private clearTimer(live: LiveLayer): void {
    if (live.timer === null) return
    clearTimeout(live.timer)
    live.timer = null
  }

  private stopLayerSources(live: LiveLayer): void {
    live.sequenceRun++
    for (const { source, gain } of [...live.sources]) {
      try {
        source.stop()
      } catch {
        // Never started or already stopped.
      }
      source.disconnect()
      gain.disconnect()
    }
    live.sources.clear()
    live.loopStarting = false
    live.firing = false
    this.setSounding(live, false)
  }

  // ── Teardown ─────────────────────────────────────────────────────────────

  dispose(): void {
    this.stopAudition()
    this.teardownStack(this.stack)
    this.stack = null
    this.volumeUnsub?.()
    this.volumeUnsub = null
    this.auditionGain?.disconnect()
    this.auditionGain = null
    this.masterGain?.disconnect()
    this.masterGain = null
    this.bufferCache.clear()
    this.decoding.clear()
    this.ctx = null
    AmbientEngine.instance = null
  }
}
