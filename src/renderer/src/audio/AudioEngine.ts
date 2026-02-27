import { toast } from 'sonner'
import { CrossfadeManager } from './CrossfadeManager'
import { LocalPlayer } from './LocalPlayer'
import { YouTubePlayer } from './YouTubePlayer'
import { useAudioStore } from '@/store/audioStore'
import type { Climate, Track } from '@/lib/types'

export interface ITrackPlayer {
  load(track: Track): Promise<void>
  play(): void
  pause(): void
  stop(): void
  getMediaSource(): MediaElementAudioSourceNode | null
  onEnded(callback: () => void): void
  onError(callback: (error: Error) => void): void
  dispose(): void
}

type ChannelId = 'A' | 'B'
type ChannelState = 'inactive' | 'loading' | 'active' | 'fading-out'
type EngineState = 'idle' | 'playing' | 'crossfading' | 'fading-to-silence'

interface Channel {
  id: ChannelId
  gainNode: GainNode
  player: ITrackPlayer | null
  state: ChannelState
}

const FADE_IN_DURATION = 1
const FADE_TO_SILENCE_DURATION = 3
const TRACK_CROSSFADE_DURATION = 2

export class AudioEngine {
  private static instance: AudioEngine | null = null

  private audioContext: AudioContext | null = null
  private channelA: Channel | null = null
  private channelB: Channel | null = null
  private activeChannelId: ChannelId = 'A'
  private crossfadeManager: CrossfadeManager
  private engineState: EngineState = 'idle'

  private currentClimate: Climate | null = null
  private currentTrackIndex = 0
  private pendingActiveChannelId: ChannelId | null = null

  private volumeUnsub: (() => void) | null = null

  private constructor() {
    this.crossfadeManager = new CrossfadeManager()
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()

      const gainA = this.audioContext.createGain()
      gainA.gain.value = 0
      gainA.connect(this.audioContext.destination)
      this.channelA = { id: 'A', gainNode: gainA, player: null, state: 'inactive' }

      const gainB = this.audioContext.createGain()
      gainB.gain.value = 0
      gainB.connect(this.audioContext.destination)
      this.channelB = { id: 'B', gainNode: gainB, player: null, state: 'inactive' }

      this.subscribeToVolumeChanges()
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    return this.audioContext
  }

  private getChannel(id: ChannelId): Channel {
    return id === 'A' ? this.channelA! : this.channelB!
  }

  private getActiveChannel(): Channel {
    return this.getChannel(this.activeChannelId)
  }

  private getInactiveChannelId(): ChannelId {
    return this.activeChannelId === 'A' ? 'B' : 'A'
  }

  private getVolume01(): number {
    return useAudioStore.getState().volume / 100
  }

  private updateStore(
    updates: Partial<{
      isPlaying: boolean
      activeClimateId: string | null
      activeTrackId: string | null
      isFadingToSilence: boolean
    }>,
  ): void {
    const store = useAudioStore.getState()
    if (updates.isPlaying !== undefined) store.setIsPlaying(updates.isPlaying)
    if (updates.activeClimateId !== undefined) store.setActiveClimateId(updates.activeClimateId)
    if (updates.activeTrackId !== undefined) store.setActiveTrackId(updates.activeTrackId)
    if (updates.isFadingToSilence !== undefined)
      store.setIsFadingToSilence(updates.isFadingToSilence)
  }

  private subscribeToVolumeChanges(): void {
    this.volumeUnsub = useAudioStore.subscribe((state, prev) => {
      if (state.volume !== prev.volume && this.engineState === 'playing') {
        const channel = this.getActiveChannel()
        this.crossfadeManager.setImmediate(channel.gainNode, state.volume / 100)
      }
    })
  }

  private createPlayer(track: Track): ITrackPlayer {
    if (track.source === 'youtube') {
      return new YouTubePlayer()
    }
    return new LocalPlayer(this.ensureContext())
  }

  private connectPlayer(player: ITrackPlayer, gainNode: GainNode): void {
    const source = player.getMediaSource()
    if (source) {
      source.connect(gainNode)
    }
  }

  private disposeChannel(channel: Channel): void {
    if (channel.player) {
      channel.player.stop()
      channel.player.dispose()
      channel.player = null
    }
    channel.state = 'inactive'
    this.crossfadeManager.setImmediate(channel.gainNode, 0)
  }

  private getNextTrackIndex(): number {
    if (!this.currentClimate || this.currentClimate.tracks.length === 0) return 0
    return (this.currentTrackIndex + 1) % this.currentClimate.tracks.length
  }

  private async loadAndPlayOnChannel(channel: Channel, track: Track): Promise<boolean> {
    channel.state = 'loading'
    const player = this.createPlayer(track)
    channel.player = player

    try {
      await player.load(track)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load track'
      toast.error(`Skipping "${track.title}": ${message}`)
      player.dispose()
      channel.player = null
      channel.state = 'inactive'
      return false
    }

    this.connectPlayer(player, channel.gainNode)
    player.play()

    player.onEnded(() => this.handleTrackEnded())
    player.onError((err) => {
      toast.error(`Playback error: ${err.message}`)
      this.handleTrackEnded()
    })

    return true
  }

  private handleTrackEnded(): void {
    if (this.engineState !== 'playing') {
      return
    }

    if (!this.currentClimate || this.currentClimate.tracks.length <= 1) {
      this.advanceToTrack(this.currentTrackIndex)
      return
    }

    this.advanceToTrack(this.getNextTrackIndex())
  }

  private completePendingCrossfade(): void {
    if (this.engineState !== 'crossfading' || !this.pendingActiveChannelId) return

    this.crossfadeManager.cancelAll()

    const inId = this.pendingActiveChannelId
    const outId: ChannelId = inId === 'A' ? 'B' : 'A'
    const outChannel = this.getChannel(outId)
    const inChannel = this.getChannel(inId)

    this.disposeChannel(outChannel)
    inChannel.state = 'active'
    this.crossfadeManager.setImmediate(inChannel.gainNode, this.getVolume01())
    this.activeChannelId = inId
    this.pendingActiveChannelId = null
    this.engineState = 'playing'
  }

  private async advanceToTrack(nextIndex: number): Promise<void> {
    if (!this.currentClimate) return

    const sorted = [...this.currentClimate.tracks].sort((a, b) => a.order - b.order)
    if (sorted.length === 0) {
      this.goIdle()
      return
    }

    const maxAttempts = sorted.length
    let attempts = 0
    let idx = nextIndex

    while (attempts < maxAttempts) {
      this.currentTrackIndex = idx % sorted.length
      const track = sorted[this.currentTrackIndex]

      this.updateStore({ activeTrackId: track.id })

      const inId = this.getInactiveChannelId()
      const inChannel = this.getChannel(inId)
      const outChannel = this.getActiveChannel()

      const loaded = await this.loadAndPlayOnChannel(inChannel, track)
      if (loaded) {
        this.engineState = 'crossfading'
        this.pendingActiveChannelId = inId

        this.crossfadeManager.crossfade(
          outChannel.id,
          outChannel.gainNode,
          inChannel.id,
          inChannel.gainNode,
          this.getVolume01(),
          TRACK_CROSSFADE_DURATION,
          () => {
            this.disposeChannel(outChannel)
            inChannel.state = 'active'
            this.activeChannelId = inId
            this.pendingActiveChannelId = null
            this.engineState = 'playing'
          },
        )
        return
      }

      attempts++
      idx = (this.currentTrackIndex + 1) % sorted.length
    }

    toast.error('All tracks failed to load')
    this.goIdle()
  }

  private goIdle(): void {
    this.crossfadeManager.cancelAll()
    if (this.channelA) this.disposeChannel(this.channelA)
    if (this.channelB) this.disposeChannel(this.channelB)
    this.engineState = 'idle'
    this.pendingActiveChannelId = null
    this.currentClimate = null
    this.currentTrackIndex = 0
    this.updateStore({
      isPlaying: false,
      activeClimateId: null,
      activeTrackId: null,
      isFadingToSilence: false,
    })
  }

  async activateClimate(climate: Climate): Promise<void> {
    if (climate.tracks.length === 0) {
      toast.error('This climate has no tracks')
      return
    }

    this.ensureContext()
    this.crossfadeManager.cancelAll()

    const sorted = [...climate.tracks].sort((a, b) => a.order - b.order)
    this.currentClimate = climate
    this.currentTrackIndex = 0

    if (this.engineState === 'idle' || this.engineState === 'fading-to-silence') {
      // Clean up any existing state
      if (this.channelA) this.disposeChannel(this.channelA)
      if (this.channelB) this.disposeChannel(this.channelB)
      this.activeChannelId = 'A'

      const channel = this.getChannel('A')
      const track = sorted[0]

      this.updateStore({
        activeClimateId: climate.id,
        activeTrackId: track.id,
        isPlaying: true,
        isFadingToSilence: false,
      })

      const loaded = await this.loadAndPlayOnChannel(channel, track)
      if (loaded) {
        channel.state = 'active'
        this.engineState = 'playing'
        this.crossfadeManager.fadeChannel(
          'A',
          channel.gainNode,
          this.getVolume01(),
          FADE_IN_DURATION,
        )
      } else {
        // Try next tracks
        await this.advanceToTrack(1)
      }
    } else {
      // Currently playing — crossfade to new climate
      const outChannel = this.getActiveChannel()
      const inId = this.getInactiveChannelId()
      const inChannel = this.getChannel(inId)
      const track = sorted[0]
      const duration = climate.crossfadeDuration

      this.updateStore({
        activeClimateId: climate.id,
        activeTrackId: track.id,
        isPlaying: true,
        isFadingToSilence: false,
      })

      const loaded = await this.loadAndPlayOnChannel(inChannel, track)
      if (loaded) {
        this.engineState = 'crossfading'
        this.pendingActiveChannelId = inId
        outChannel.state = 'fading-out'
        inChannel.state = 'active'

        this.crossfadeManager.crossfade(
          outChannel.id,
          outChannel.gainNode,
          inChannel.id,
          inChannel.gainNode,
          this.getVolume01(),
          duration,
          () => {
            this.disposeChannel(outChannel)
            this.activeChannelId = inId
            this.pendingActiveChannelId = null
            this.engineState = 'playing'
          },
        )
      } else {
        await this.advanceToTrack(1)
      }
    }
  }

  async nextTrack(): Promise<void> {
    if (!this.currentClimate) return

    if (this.engineState === 'crossfading') {
      this.completePendingCrossfade()
    }

    if (this.engineState !== 'playing') return
    await this.advanceToTrack(this.getNextTrackIndex())
  }

  fadeToSilence(): void {
    if (this.engineState !== 'playing') return

    this.engineState = 'fading-to-silence'
    this.updateStore({ isFadingToSilence: true })

    const channel = this.getActiveChannel()
    this.crossfadeManager.fadeChannel(
      channel.id,
      channel.gainNode,
      0,
      FADE_TO_SILENCE_DURATION,
      () => {
        channel.player?.pause()
        this.updateStore({ isPlaying: false })
      },
    )
  }

  resume(): void {
    const store = useAudioStore.getState()
    if (!store.activeClimateId || store.isPlaying) return

    const channel = this.getActiveChannel()
    if (!channel.player) return

    this.ensureContext()
    channel.player.play()
    this.engineState = 'playing'

    this.updateStore({ isPlaying: true, isFadingToSilence: false })

    this.crossfadeManager.fadeChannel(
      channel.id,
      channel.gainNode,
      this.getVolume01(),
      FADE_IN_DURATION,
    )
  }

  setVolume(volume: number): void {
    if (this.engineState === 'playing') {
      const channel = this.getActiveChannel()
      this.crossfadeManager.setImmediate(channel.gainNode, volume / 100)
    }
  }

  dispose(): void {
    this.crossfadeManager.cancelAll()
    if (this.channelA) this.disposeChannel(this.channelA)
    if (this.channelB) this.disposeChannel(this.channelB)
    this.volumeUnsub?.()
    this.audioContext?.close()
    this.audioContext = null
    this.channelA = null
    this.channelB = null
    this.engineState = 'idle'
    AudioEngine.instance = null
  }
}
