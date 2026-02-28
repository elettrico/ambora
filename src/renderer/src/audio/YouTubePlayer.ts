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
}

export class YouTubePlayer implements ITrackPlayer {
  private player: YTPlayer | null = null
  private container: HTMLDivElement | null = null
  private endedCallback: (() => void) | null = null
  private errorCallback: ((error: Error) => void) | null = null
  private disposed = false

  async load(track: Track): Promise<void> {
    if (!track.youtubeVideoId) {
      throw new Error(`Track "${track.title}" has no YouTube video ID`)
    }

    await loadYouTubeAPI()

    if (this.disposed) {
      throw new Error('Player was disposed during load')
    }

    this.container = document.createElement('div')
    this.container.style.position = 'absolute'
    this.container.style.top = '-9999px'
    this.container.style.width = '1px'
    this.container.style.height = '1px'
    this.container.style.overflow = 'hidden'
    document.body.appendChild(this.container)

    const playerDiv = document.createElement('div')
    this.container.appendChild(playerDiv)

    const videoId = track.youtubeVideoId

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('YouTube player failed to load (timeout)'))
      }, 15_000)

      this.player = new window.YT.Player(playerDiv, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
            clearTimeout(timeout)
            if (this.disposed) {
              reject(new Error('Player was disposed during load'))
              return
            }
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
            if (this.disposed) return
            this.errorCallback?.(new Error(message))
          },
        },
      })
    })
  }

  play(): void {
    this.player?.playVideo()
  }

  pause(): void {
    this.player?.pauseVideo()
  }

  stop(): void {
    this.player?.stopVideo()
  }

  setVolume(volume: number): void {
    this.player?.setVolume(Math.round(volume * 100))
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
    try {
      this.player?.destroy()
    } catch {
      // Player may already be destroyed
    }
    this.player = null
    if (this.container) {
      this.container.remove()
      this.container = null
    }
    this.endedCallback = null
    this.errorCallback = null
  }
}
