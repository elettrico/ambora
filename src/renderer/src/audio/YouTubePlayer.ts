import type { ITrackPlayer } from './AudioEngine'
import type { Track } from '@/lib/types'
import { loadYouTubeAPI, YTPlayerState } from './youtube-api'
import type { YTPlayer } from './youtube-api'

const YT_ERROR_MESSAGES: Record<number, string> = {
  2: 'Invalid video ID',
  5: 'YouTube player error (HTML5)',
  100: 'Video not found or removed',
  101: "This video's owner has disabled embedded playback. Download the audio and add it as a local file instead.",
  150: "This video's owner has disabled embedded playback. Download the audio and add it as a local file instead.",
  // 153 is an embedder/referrer/config problem, not an owner setting.
  153: 'YouTube refused to embed this video in Ambora (player configuration). Try again, or download the audio and add it as a local file.',
}

// Orphaned YouTube iframes that can't be removed yet because doing so
// triggers YT IFrame API global cleanup that disrupts other active players.
// They are removed in bulk when all playback stops (safe point).
const orphanedContainers: HTMLDivElement[] = []

/** Serialize `new YT.Player` — concurrent creates hang `onReady` under the shared iframe API. */
let ytCreateChain: Promise<void> = Promise.resolve()

function withYtCreateMutex<T>(fn: () => Promise<T>): Promise<T> {
  const run = ytCreateChain.then(fn, fn)
  ytCreateChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function removeOrphanedYouTubeContainers(): void {
  for (const container of orphanedContainers) {
    container.remove()
  }
  orphanedContainers.length = 0
}

export class YouTubePlayer implements ITrackPlayer {
  private player: YTPlayer | null = null
  private container: HTMLDivElement | null = null
  private endedCallback: (() => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null
  private disposed = false
  private loadSucceeded = false

  async load(track: Track): Promise<void> {
    if (!track.youtubeVideoId) {
      throw new Error(`Track "${track.title}" has no YouTube video ID`)
    }

    await loadYouTubeAPI()

    if (this.disposed) {
      throw new Error('Player was disposed during load')
    }

    await withYtCreateMutex(() => this.createPlayer(track.youtubeVideoId!))
  }

  private createPlayer(videoId: string): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error('Player was disposed during load'))
    }

    this.container = document.createElement('div')
    this.container.style.position = 'absolute'
    this.container.style.left = '-10000px'
    this.container.style.top = '0'
    // A real box size is more reliable for offscreen iframe init than 1×1.
    this.container.style.width = '200px'
    this.container.style.height = '200px'
    this.container.style.opacity = '0'
    this.container.style.pointerEvents = 'none'
    this.container.style.overflow = 'hidden'
    document.body.appendChild(this.container)

    const playerDiv = document.createElement('div')
    this.container.appendChild(playerDiv)

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.teardownFailedLoad()
        reject(new Error('YouTube player failed to load (timeout)'))
      }, 15_000)

      try {
        this.player = new window.YT.Player(playerDiv, {
          videoId,
          width: 200,
          height: 200,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              clearTimeout(timeout)
              if (this.disposed) {
                this.teardownFailedLoad()
                reject(new Error('Player was disposed during load'))
                return
              }
              this.loadSucceeded = true
              resolve()
            },
            onStateChange: (event) => {
              if (this.disposed) return
              if (event.data === YTPlayerState.ENDED) {
                this.endedCallback?.()
              }
            },
            onError: (event) => {
              clearTimeout(timeout)
              const message = YT_ERROR_MESSAGES[event.data] ?? `YouTube error (code ${event.data})`
              this.teardownFailedLoad()
              if (this.disposed) return
              reject(new Error(message))
              this.errorCallback?.(new Error(message))
            },
          },
        })
      } catch (error) {
        clearTimeout(timeout)
        this.teardownFailedLoad()
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  /** Destroy a player that never became ready — safe because no sibling relies on it yet. */
  private teardownFailedLoad(): void {
    if (this.loadSucceeded) return
    try {
      this.player?.destroy()
    } catch {
      // ignore
    }
    this.player = null
    if (this.container) {
      this.container.remove()
      this.container = null
    }
  }

  play(): void {
    this.player?.playVideo()
  }

  pause(): void {
    this.player?.pauseVideo()
  }

  stop(): void {
    // Intentionally no-op. Calling stopVideo() triggers YouTube IFrame API
    // global state changes that can disrupt other active players on the page.
  }

  setVolume(volume: number): void {
    this.player?.setVolume(Math.round(volume * 100))
  }

  getDuration(): number | undefined {
    const dur = this.player?.getDuration()
    return dur !== undefined && dur > 0 ? dur : undefined
  }

  getCurrentTime(): number {
    try {
      return this.player?.getCurrentTime() ?? 0
    } catch {
      return 0
    }
  }

  seekTo(timeSec: number): void {
    try {
      this.player?.seekTo(timeSec, true)
    } catch {
      // Player may be in a bad state — ignore.
    }
  }

  hasEnded(): boolean {
    try {
      return this.player?.getPlayerState() === YTPlayerState.ENDED
    } catch {
      return false
    }
  }

  getMediaSource(): MediaElementAudioSourceNode | null {
    return null
  }

  onEnded(callback: () => void): void {
    this.endedCallback = callback
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    // Mute so no audio leaks from the orphaned iframe.
    try {
      this.player?.setVolume(0)
    } catch {
      // Player may already be in a bad state — ignore.
    }

    if (!this.loadSucceeded) {
      this.teardownFailedLoad()
    } else if (this.container) {
      // Do NOT remove a ready iframe now. Removing a YouTube iframe triggers
      // YT IFrame API global cleanup that disrupts other active players
      // sharing the same window.YT instance. Instead, park it and let the
      // AudioEngine remove all orphans at a safe point (when idle).
      this.player = null
      orphanedContainers.push(this.container)
      this.container = null
    } else {
      this.player = null
    }

    this.endedCallback = null
    this.errorCallback = null
  }
}
