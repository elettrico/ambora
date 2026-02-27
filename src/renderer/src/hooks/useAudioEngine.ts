import { useMemo } from 'react'
import { AudioEngine } from '@/audio/AudioEngine'

export function useAudioEngine(): AudioEngine {
  return useMemo(() => AudioEngine.getInstance(), [])
}
