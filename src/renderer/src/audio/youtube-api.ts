export interface YTPlayerEvent {
  target: YTPlayer
  data: number
}

export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  setVolume(volume: number): void
  getVolume(): number
  destroy(): void
  getPlayerState(): number
  getDuration(): number
  getCurrentTime(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
}

export interface YTPlayerOptions {
  height?: string | number
  width?: string | number
  videoId?: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (event: YTPlayerEvent) => void
    onStateChange?: (event: YTPlayerEvent) => void
    onError?: (event: YTPlayerEvent) => void
  }
}

export const YTPlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string | HTMLElement, options: YTPlayerOptions) => YTPlayer
      PlayerState: typeof YTPlayerState
    }
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

let apiPromise: Promise<void> | null = null

export function loadYouTubeAPI(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve()
  }

  if (apiPromise) {
    return apiPromise
  }

  apiPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      apiPromise = null
      reject(new Error('YouTube IFrame API failed to load (timeout)'))
    }, 10_000)

    window.onYouTubeIframeAPIReady = (): void => {
      clearTimeout(timeout)
      window.onYouTubeIframeAPIReady = undefined
      resolve()
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = (): void => {
      clearTimeout(timeout)
      apiPromise = null
      reject(new Error('Failed to load YouTube IFrame API script'))
    }
    document.head.appendChild(script)
  })

  return apiPromise
}
