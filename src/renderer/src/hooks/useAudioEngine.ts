import { useEffect, useMemo } from 'react'
import { AudioEngine } from '@/audio/AudioEngine'
import { useCampaignStore } from '@/store/campaignStore'

export function useAudioEngine(): AudioEngine {
  const engine = useMemo(() => AudioEngine.getInstance(), [])
  const campaigns = useCampaignStore((s) => s.campaigns)
  const updateTrackDuration = useCampaignStore((s) => s.updateTrackDuration)

  useEffect(() => {
    engine.setOnDurationAvailable((trackId, duration) => {
      for (const campaign of campaigns) {
        for (const climate of campaign.climates) {
          const track = climate.tracks.find((t) => t.id === trackId)
          if (track && track.duration === undefined) {
            updateTrackDuration(campaign.id, climate.id, trackId, duration)
            return
          }
        }
      }
    })
  }, [engine, campaigns, updateTrackDuration])

  return engine
}
