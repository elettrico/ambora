import type { ITrackPlayer } from './AudioEngine'

export class YouTubePlayer implements ITrackPlayer {
  async load(): Promise<void> {
    throw new Error('YouTube playback not yet implemented')
  }

  play(): void {
    // stub
  }

  pause(): void {
    // stub
  }

  stop(): void {
    // stub
  }

  getMediaSource(): MediaElementAudioSourceNode | null {
    return null
  }

  onEnded(): void {
    // stub
  }

  onError(): void {
    // stub
  }

  dispose(): void {
    // stub
  }
}
