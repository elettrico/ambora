import { useEffect } from 'react'
import { useAudioStore } from '@/store/audioStore'
import { useCampaignStore } from '@/store/campaignStore'
import { AudioEngine } from '@/audio/AudioEngine'
import type { PlaybackState, RemoteFullState } from '@/lib/types'

function getPlaybackState(): PlaybackState {
  const audio = useAudioStore.getState()
  const { activeCampaignId } = useCampaignStore.getState()
  return {
    activeCampaignId,
    activeClimateId: audio.activeClimateId,
    activeTrackId: audio.activeTrackId,
    isPlaying: audio.isPlaying,
    volume: audio.volume,
    isFadingToSilence: audio.isFadingToSilence,
  }
}

function getFullState(): RemoteFullState {
  const { campaigns, activeCampaignId } = useCampaignStore.getState()
  return {
    campaigns,
    activeCampaignId,
    playback: getPlaybackState(),
  }
}

export function useRemoteSync(): void {
  useEffect(() => {
    // Push initial full state to main process
    const fullState = getFullState()
    window.api.sendFullState(fullState)

    // Subscribe to audio store changes → push playback updates
    const unsubAudio = useAudioStore.subscribe((state, prev) => {
      const changed =
        state.isPlaying !== prev.isPlaying ||
        state.activeClimateId !== prev.activeClimateId ||
        state.activeTrackId !== prev.activeTrackId ||
        state.volume !== prev.volume ||
        state.isFadingToSilence !== prev.isFadingToSilence

      if (changed) {
        const playback = getPlaybackState()
        window.api.sendStateUpdate({ type: 'playback-update', payload: playback })
        window.api.sendFullState(getFullState())
      }
    })

    // Subscribe to campaign store changes → push campaign updates
    const unsubCampaigns = useCampaignStore.subscribe((state, prev) => {
      if (state.campaigns !== prev.campaigns || state.activeCampaignId !== prev.activeCampaignId) {
        window.api.sendStateUpdate({
          type: 'campaigns-update',
          payload: { campaigns: state.campaigns },
        })
        window.api.sendFullState(getFullState())
      }
    })

    // Listen for remote commands from phone
    const unsubCommands = window.api.onRemoteCommand((command) => {
      const engine = AudioEngine.getInstance()
      const campaignStore = useCampaignStore.getState()
      const audioStore = useAudioStore.getState()

      switch (command.type) {
        case 'activate-climate': {
          const campaign = campaignStore.campaigns.find(
            (c) => c.id === campaignStore.activeCampaignId,
          )
          const climate = campaign?.climates.find((cl) => cl.id === command.payload.climateId)
          if (climate) {
            engine.activateClimate(climate)
          }
          break
        }
        case 'play-pause': {
          if (audioStore.isPlaying) {
            engine.fadeToSilence()
          } else {
            engine.resume()
          }
          break
        }
        case 'skip-track': {
          engine.nextTrack()
          break
        }
        case 'set-volume': {
          const volume = Math.max(0, Math.min(100, command.payload.volume))
          audioStore.setVolume(volume)
          engine.setVolume(volume)
          break
        }
      }
    })

    return () => {
      unsubAudio()
      unsubCampaigns()
      unsubCommands()
    }
  }, [])
}
