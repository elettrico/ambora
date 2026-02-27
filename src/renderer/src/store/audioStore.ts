import { create } from 'zustand'
import { DEFAULTS } from '@/lib/constants'

export interface FadeAnimation {
  climateId: string
  direction: 'in' | 'out'
  durationMs: number
  startedAt: number
}

interface AudioStore {
  isPlaying: boolean
  volume: number
  activeClimateId: string | null
  activeTrackId: string | null
  isFadingToSilence: boolean
  fadeAnimations: FadeAnimation[]

  setIsPlaying: (isPlaying: boolean) => void
  setVolume: (volume: number) => void
  setActiveClimateId: (id: string | null) => void
  setActiveTrackId: (id: string | null) => void
  setIsFadingToSilence: (isFading: boolean) => void
  startFadeAnimation: (animation: FadeAnimation) => void
  clearAllFadeAnimations: () => void
}

export const useAudioStore = create<AudioStore>((set) => ({
  isPlaying: false,
  volume: DEFAULTS.volume,
  activeClimateId: null,
  activeTrackId: null,
  isFadingToSilence: false,
  fadeAnimations: [],

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setActiveClimateId: (id) => set({ activeClimateId: id }),
  setActiveTrackId: (id) => set({ activeTrackId: id }),
  setIsFadingToSilence: (isFading) => set({ isFadingToSilence: isFading }),
  startFadeAnimation: (animation) =>
    set((state) => ({
      fadeAnimations: [
        ...state.fadeAnimations.filter((fa) => fa.climateId !== animation.climateId),
        animation,
      ],
    })),
  clearAllFadeAnimations: () => set({ fadeAnimations: [] }),
}))
