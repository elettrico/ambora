import type { ITrackPlayer } from './AudioEngine'
import type { Track } from '@/lib/types'
import { localAudioUrl } from '@/lib/localAudioUrl'

const LOAD_TIMEOUT_MS = 30_000
const MAX_LOAD_ATTEMPTS = 2

export class LocalPlayer implements ITrackPlayer {
  private audio: HTMLAudioElement
  private mediaSource: MediaElementAudioSourceNode | null = null
  private endedCallback: (() => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null
  private disposed = false

  constructor(private audioContext: AudioContext) {
    this.audio = new Audio()

    this.audio.addEventListener('ended', () => {
      if (!this.disposed) this.endedCallback?.()
    })

    this.audio.addEventListener('error', () => {
      if (this.disposed) return
      // Load-time errors are handled by the load() promise; this catches mid-play.
      if (!this.mediaSource) return
      const code = this.audio.error?.code
      const message = this.audio.error?.message ?? 'Unknown playback error'
      this.errorCallback?.(new Error(`Audio error (code ${code}): ${message}`))
    })
  }

  async load(track: Track): Promise<void> {
    if (!track.localFilePath) {
      throw new Error(`Track "${track.title}" has no local file path`)
    }

    const token = await window.api.registerAudioPath(track.localFilePath)
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_LOAD_ATTEMPTS; attempt++) {
      if (this.disposed) {
        throw new Error('Player was disposed during load')
      }
      try {
        await this.loadOnce(token)
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        // Retry once on format/src-not-supported — often a poisoned concurrent load.
        const isFormat =
          lastError.message.includes('(code 4)') ||
          lastError.message.includes('Format error') ||
          lastError.message.includes('MEDIA_ELEMENT_ERROR')
        if (!isFormat || attempt >= MAX_LOAD_ATTEMPTS) break
      }
    }

    throw lastError ?? new Error('Failed to load audio file')
  }

  private loadOnce(token: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const onReady = (): void => {
        cleanup()
        try {
          if (!this.mediaSource) {
            this.mediaSource = this.audioContext.createMediaElementSource(this.audio)
          }
          resolve()
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }
      const onError = (): void => {
        cleanup()
        const code = this.audio.error?.code
        const message = this.audio.error?.message ?? 'Failed to load audio file'
        reject(new Error(`Audio error (code ${code}): ${message}`))
      }
      const onTimeout = (): void => {
        cleanup()
        reject(new Error('Audio load timed out'))
      }
      const cleanup = (): void => {
        clearTimeout(timer)
        this.audio.removeEventListener('canplaythrough', onReady)
        this.audio.removeEventListener('error', onError)
      }

      const timer = setTimeout(onTimeout, LOAD_TIMEOUT_MS)
      this.audio.addEventListener('canplaythrough', onReady, { once: true })
      this.audio.addEventListener('error', onError, { once: true })
      // Attach listeners before assigning src so we never miss a fast error.
      this.audio.src = localAudioUrl(token)
      this.audio.load()
    })
  }

  play(): void {
    void this.audio.play()
  }

  pause(): void {
    this.audio.pause()
  }

  stop(): void {
    this.audio.pause()
    this.audio.currentTime = 0
  }

  getDuration(): number | undefined {
    const dur = this.audio.duration
    return Number.isFinite(dur) ? dur : undefined
  }

  getCurrentTime(): number {
    return this.audio.currentTime
  }

  seekTo(timeSec: number): void {
    this.audio.currentTime = timeSec
  }

  hasEnded(): boolean {
    return this.audio.ended
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setVolume(_volume: number): void {
    // Volume controlled via GainNode
  }

  getMediaSource(): MediaElementAudioSourceNode | null {
    return this.mediaSource
  }

  onEnded(callback: () => void): void {
    this.endedCallback = callback
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback
  }

  dispose(): void {
    this.disposed = true
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
    this.mediaSource?.disconnect()
    this.mediaSource = null
    this.endedCallback = null
    this.errorCallback = null
  }
}
