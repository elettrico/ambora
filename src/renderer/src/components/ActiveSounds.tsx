import { useEffect, useMemo, useState } from 'react'
import { Music2, Play, Square, Waves, Zap } from 'lucide-react'
import { AmbientEngine } from '@/audio/AmbientEngine'
import { SoundboardEngine, type SoundboardActivity } from '@/audio/SoundboardEngine'
import { Button } from '@/components/ui/button'
import { useAudioStore } from '@/store/audioStore'
import { useCampaignStore } from '@/store/campaignStore'
import type { AmbientLayer, SoundboardSound } from '@/lib/types'
import { SidebarSection } from './SidebarSection'

interface ActiveRowProps {
  icon: React.ReactNode
  category: string
  name: string
  detail?: string
  onStop?: () => void
}

interface ActiveSoundsProps {
  fill?: boolean
  onCountChange?: (count: number) => void
}

function ActiveRow({ icon, category, name, detail, onStop }: ActiveRowProps): React.JSX.Element {
  return (
    <div className="group flex min-h-9 items-center gap-2 rounded px-2 hover:bg-surface-2">
      <span className="shrink-0 text-accent">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] text-text-primary">{name}</div>
        <div className="truncate text-[10px] uppercase tracking-[0.05em] text-text-tertiary">
          {category}
          {detail ? ` · ${detail}` : ''}
        </div>
      </div>
      {onStop && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-text-tertiary opacity-0 hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
          onClick={onStop}
          aria-label={`Stop ${name}`}
          title={`Stop ${name}`}
        >
          <Square className="size-3 fill-current" />
        </Button>
      )}
    </div>
  )
}

export function ActiveSounds({
  fill = false,
  onCountChange,
}: ActiveSoundsProps): React.JSX.Element {
  const campaigns = useCampaignStore((state) => state.campaigns)
  const { isPlaying, activeClimateId, activeTrackId, ambientRuntime, auditioningLayerId } =
    useAudioStore()
  const [open, setOpen] = useState(
    () => localStorage.getItem('ambora:active-sounds-open') !== 'false',
  )
  const [soundboardActivity, setSoundboardActivity] = useState<Record<string, SoundboardActivity>>(
    {},
  )

  useEffect(
    () =>
      SoundboardEngine.getInstance().subscribe((soundId, activity) => {
        setSoundboardActivity((current) => {
          if (!activity.playing) {
            if (!(soundId in current)) return current
            const next = { ...current }
            delete next[soundId]
            return next
          }
          return { ...current, [soundId]: activity }
        })
      }),
    [],
  )

  const lookup = useMemo(() => {
    let activeClimateName: string | undefined
    let trackName: string | undefined
    const ambientLayers = new Map<string, AmbientLayer>()
    const sounds = new Map<string, SoundboardSound>()
    let previewLayer: AmbientLayer | undefined

    for (const campaign of campaigns) {
      for (const climate of campaign.climates) {
        if (climate.id === activeClimateId) {
          activeClimateName = climate.name
          trackName = climate.tracks.find((track) => track.id === activeTrackId)?.title
        }
        for (const layer of climate.ambientLayers ?? []) {
          ambientLayers.set(layer.id, layer)
          if (layer.id === auditioningLayerId) previewLayer = layer
        }
      }
      for (const sound of campaign.soundboard ?? []) sounds.set(sound.id, sound)
    }

    return { activeClimateName, trackName, ambientLayers, sounds, previewLayer }
  }, [campaigns, activeClimateId, activeTrackId, auditioningLayerId])

  const soundingLayers = Object.entries(ambientRuntime)
    .filter(([, runtime]) => runtime.sounding)
    .map(([layerId]) => lookup.ambientLayers.get(layerId))
    .filter((layer): layer is AmbientLayer => layer !== undefined)
  const activeSounds = Object.entries(soundboardActivity)
    .map(([soundId, activity]) => ({ sound: lookup.sounds.get(soundId), activity }))
    .filter(
      (entry): entry is { sound: SoundboardSound; activity: SoundboardActivity } =>
        entry.sound !== undefined,
    )
  const count =
    (isPlaying && lookup.trackName ? 1 : 0) +
    soundingLayers.length +
    activeSounds.reduce((total, entry) => total + entry.activity.voiceCount, 0) +
    (lookup.previewLayer ? 1 : 0)

  useEffect(() => {
    onCountChange?.(count)
  }, [count, onCountChange])

  function toggle(): void {
    setOpen((current) => {
      localStorage.setItem('ambora:active-sounds-open', String(!current))
      return !current
    })
  }

  return (
    <SidebarSection
      title="Active Sounds"
      open={open}
      onToggle={toggle}
      trailing={
        <span className="flex items-center gap-1.5 text-[10px] font-normal tabular-nums">
          {count > 0 && <span className="size-1.5 animate-pulse rounded-full bg-success" />}
          {count}
        </span>
      }
      className="border-t border-border-subtle"
      contentClassName="overflow-y-auto px-3 pb-2"
      fill={fill}
    >
      {count === 0 ? (
        <p className="px-2 py-3 text-[11px] text-text-tertiary">Nothing playing</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {isPlaying && lookup.trackName && (
            <ActiveRow
              icon={<Music2 className="size-3.5" />}
              category="Music"
              name={lookup.trackName}
              detail={lookup.activeClimateName}
            />
          )}
          {soundingLayers.map((layer) => (
            <ActiveRow
              key={layer.id}
              icon={<Waves className="size-3.5" />}
              category="Ambient"
              name={layer.name}
              onStop={() => AmbientEngine.getInstance().setLayerEnabled(layer.id, false)}
            />
          ))}
          {activeSounds.map(({ sound, activity }) => (
            <ActiveRow
              key={sound.id}
              icon={<Zap className="size-3.5" />}
              category="SFX"
              name={sound.name}
              detail={activity.voiceCount > 1 ? `×${String(activity.voiceCount)}` : undefined}
              onStop={() => SoundboardEngine.getInstance().stop(sound.id)}
            />
          ))}
          {lookup.previewLayer && (
            <ActiveRow
              icon={<Play className="size-3.5" />}
              category="Preview"
              name={lookup.previewLayer.name}
              onStop={() => AmbientEngine.getInstance().stopAudition()}
            />
          )}
        </div>
      )}
    </SidebarSection>
  )
}
