import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Music2, Play, Waves, Zap } from 'lucide-react'
import { AmbientEngine } from '@/audio/AmbientEngine'
import { AudioEngine } from '@/audio/AudioEngine'
import { SoundboardEngine, type SoundboardActivity } from '@/audio/SoundboardEngine'
import { AudioLevelMeter } from '@/components/AudioLevelMeter'
import type { AmbientLayer, SoundboardSound } from '@/lib/types'
import { useAudioStore } from '@/store/audioStore'
import { useCampaignStore } from '@/store/campaignStore'
import { SidebarSection } from './SidebarSection'

interface Progress {
  startedAtMs: number
  durationMs: number
}
interface ActiveRowProps {
  name: string
  detail?: string
  progress?: Progress
  nowMs: number
  control?: React.ReactNode
}
interface ActiveSoundsProps {
  fill?: boolean
  onCountChange?: (count: number) => void
}

function ActiveRow({ name, detail, progress, nowMs, control }: ActiveRowProps): React.JSX.Element {
  const remaining = progress
    ? Math.max(0, Math.min(1, 1 - (nowMs - progress.startedAtMs) / progress.durationMs))
    : null
  return (
    <div className="relative flex min-h-9 items-center gap-2 overflow-hidden rounded px-2 hover:bg-surface-2">
      {control}
      <div className="relative z-10 grid min-h-[26px] min-w-0 flex-1 grid-rows-[14px_12px]">
        <div className="truncate text-[12px] text-[#D8D8D8]">{name}</div>
        <div className="truncate text-[10px] text-text-tertiary">{detail}</div>
      </div>
      {remaining !== null && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-2 right-2 h-px origin-left bg-accent/70 transition-transform duration-200 ease-linear motion-reduce:transition-none"
          style={{ transform: `scaleX(${String(remaining)})` }}
        />
      )}
    </div>
  )
}

function ActiveSection({
  title,
  icon,
  meter,
  children,
}: {
  title: string
  icon: React.ReactNode
  meter: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-0.5">
      <h3 className="flex items-center gap-1.5 px-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
        <span>{icon}</span>
        {title}
        <span className="ml-auto">{meter}</span>
      </h3>
      {children}
    </section>
  )
}

export function ActiveSounds({
  fill = false,
  onCountChange,
}: ActiveSoundsProps): React.JSX.Element {
  const campaigns = useCampaignStore((state) => state.campaigns)
  const {
    isPlaying,
    activeClimateId,
    activeTrackId,
    previousActiveClimateId,
    previousActiveTrackId,
    isTrackLoading,
    ambientRuntime,
    fadeAnimations,
  } = useAudioStore()
  const [open, setOpen] = useState(
    () => localStorage.getItem('ambora:active-sounds-open') !== 'false',
  )
  const [soundboardActivity, setSoundboardActivity] = useState<Record<string, SoundboardActivity>>(
    {},
  )
  const [nowMs, setNowMs] = useState(() => Date.now())
  const registeredFadeOut = fadeAnimations.find((animation) => animation.direction === 'out')
  // A fade-out can mean either a transition to another climate or stopping the
  // current one. Only the former has a second, outgoing climate to display.
  const transitionFadeOut =
    registeredFadeOut && registeredFadeOut.climateId !== activeClimateId
      ? registeredFadeOut
      : undefined
  const pendingFadeOut =
    !registeredFadeOut &&
    isTrackLoading &&
    previousActiveClimateId !== null &&
    previousActiveClimateId !== activeClimateId
      ? {
          climateId: previousActiveClimateId,
          trackId: previousActiveTrackId ?? undefined,
          direction: 'out' as const,
          durationMs: 0,
          startedAt: 0,
        }
      : undefined
  const fadingOut = transitionFadeOut ?? pendingFadeOut

  useEffect(
    () =>
      SoundboardEngine.getInstance().subscribe((soundId, activity) =>
        setSoundboardActivity((current) => {
          if (!activity.playing) {
            if (!(soundId in current)) return current
            const next = { ...current }
            delete next[soundId]
            return next
          }
          return { ...current, [soundId]: activity }
        }),
      ),
    [],
  )

  const lookup = useMemo(() => {
    let climateName: string | undefined
    let climateColor: string | undefined
    let trackName: string | undefined
    let ambientLayers: AmbientLayer[] = []
    let fadingClimateName: string | undefined
    let fadingClimateColor: string | undefined
    let fadingTrackName: string | undefined
    let fadingAmbientLayers: AmbientLayer[] = []
    const sounds = new Map<string, SoundboardSound>()
    for (const campaign of campaigns) {
      for (const climate of campaign.climates) {
        if (climate.id === activeClimateId) {
          climateName = climate.name
          climateColor = climate.color
          trackName = climate.tracks.find((track) => track.id === activeTrackId)?.title
          ambientLayers = [...(climate.ambientLayers ?? [])].sort((a, b) => a.order - b.order)
        }
        if (climate.id === fadingOut?.climateId) {
          fadingClimateName = climate.name
          fadingClimateColor = climate.color
          fadingTrackName = climate.tracks.find((track) => track.id === fadingOut.trackId)?.title
          fadingAmbientLayers = [...(climate.ambientLayers ?? [])].sort((a, b) => a.order - b.order)
        }
      }
      for (const sound of campaign.soundboard ?? []) sounds.set(sound.id, sound)
    }
    return {
      climateName,
      climateColor,
      trackName,
      ambientLayers,
      fadingClimateName,
      fadingClimateColor,
      fadingTrackName,
      fadingAmbientLayers,
      sounds,
    }
  }, [campaigns, activeClimateId, activeTrackId, fadingOut])

  const activeSounds = Object.entries(soundboardActivity)
    .map(([soundId, activity]) => ({ sound: lookup.sounds.get(soundId), activity }))
    .filter(
      (entry): entry is { sound: SoundboardSound; activity: SoundboardActivity } =>
        entry.sound !== undefined,
    )
    .sort((a, b) => (a.activity.startedAtMs ?? 0) - (b.activity.startedAtMs ?? 0))
  const musicPlayback = isPlaying ? AudioEngine.getInstance().getPlaybackProgress() : null
  const hasTimedPlayback =
    musicPlayback?.durationSec !== undefined ||
    Object.values(ambientRuntime).some((runtime) => runtime.playbackDurationMs !== undefined) ||
    activeSounds.some(({ activity }) => activity.durationMs !== undefined)
  useEffect(() => {
    if (!hasTimedPlayback) return
    const interval = setInterval(() => setNowMs(Date.now()), 250)
    return () => clearInterval(interval)
  }, [hasTimedPlayback])

  const count =
    (isPlaying && lookup.trackName ? 1 : 0) +
    Object.values(ambientRuntime).filter((runtime) => runtime.sounding).length +
    activeSounds.reduce((total, entry) => total + entry.activity.voiceCount, 0)
  useEffect(() => {
    onCountChange?.(count)
  }, [count, onCountChange])
  const hasContent =
    Boolean(isPlaying && lookup.trackName) ||
    Boolean(isPlaying && lookup.ambientLayers.length > 0) ||
    Boolean(lookup.fadingTrackName) ||
    lookup.fadingAmbientLayers.length > 0 ||
    activeSounds.length > 0
  const toggle = (): void =>
    setOpen((current) => {
      localStorage.setItem('ambora:active-sounds-open', String(!current))
      return !current
    })

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
      {!hasContent ? (
        <p className="px-2 py-3 text-[11px] text-text-tertiary">Nothing playing</p>
      ) : (
        <div className="flex flex-col gap-1">
          {isPlaying && lookup.climateName && (
            <div className="px-2 pt-2">
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-text-primary">
                {lookup.fadingClimateName && <span>{lookup.fadingClimateName}</span>}
                {lookup.fadingClimateName && <ArrowRight className="size-3 text-text-tertiary" />}
                <span>{lookup.climateName}</span>
              </p>
              <span
                className="mt-1 block h-px w-full"
                style={{
                  background: lookup.fadingClimateColor
                    ? `linear-gradient(to right, ${lookup.fadingClimateColor}, ${lookup.climateColor})`
                    : lookup.climateColor,
                }}
              />
            </div>
          )}
          {isPlaying && lookup.trackName && (
            <ActiveSection
              title="Music"
              icon={<Music2 className="size-3.5" />}
              meter={
                <AudioLevelMeter
                  label="Music"
                  analyser={() => AudioEngine.getInstance().getMeterAnalyser()}
                />
              }
            >
              {lookup.fadingTrackName && (
                <ActiveRow name={lookup.fadingTrackName} detail="Fading out" nowMs={nowMs} />
              )}
              <ActiveRow
                name={lookup.trackName}
                nowMs={nowMs}
                progress={
                  musicPlayback?.durationSec !== undefined
                    ? {
                        startedAtMs: nowMs - musicPlayback.positionSec * 1000,
                        durationMs: musicPlayback.durationSec * 1000,
                      }
                    : undefined
                }
              />
            </ActiveSection>
          )}
          {isPlaying &&
            (lookup.ambientLayers.length > 0 || lookup.fadingAmbientLayers.length > 0) && (
              <ActiveSection
                title="Ambient"
                icon={<Waves className="size-3.5" />}
                meter={
                  <AudioLevelMeter
                    label="Ambient"
                    analyser={() => AmbientEngine.getInstance().getMeterAnalyser()}
                  />
                }
              >
                {lookup.fadingAmbientLayers.map((layer) => (
                  <ActiveRow
                    key={`fading-${layer.id}`}
                    control={
                      <span className="relative z-10 flex size-6 shrink-0 items-center justify-center">
                        <span
                          className="size-3 animate-pulse rounded-full"
                          style={{ backgroundColor: lookup.fadingClimateColor }}
                        />
                      </span>
                    }
                    name={layer.name}
                    detail="Fading out"
                    nowMs={nowMs}
                  />
                ))}
                {lookup.ambientLayers.map((layer) => {
                  const runtime = ambientRuntime[layer.id]
                  const isTrigger = layer.mode === 'oneshot' || layer.mode === 'sequence'
                  const enabled = runtime?.enabled ?? layer.enabled
                  const control = isTrigger ? (
                    <button
                      type="button"
                      disabled={layer.clips.length === 0}
                      className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-1 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => AmbientEngine.getInstance().triggerLayer(layer.id)}
                      aria-label={`Play ${layer.name}`}
                      title={`Play ${layer.name}`}
                    >
                      <Play className="size-3.5" style={{ color: lookup.climateColor }} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-1"
                      onClick={() =>
                        AmbientEngine.getInstance().setLayerEnabled(layer.id, !enabled)
                      }
                      aria-label={`${enabled ? 'Disable' : 'Enable'} ${layer.name}`}
                      title={`${enabled ? 'Disable' : 'Enable'} ${layer.name}`}
                    >
                      <span
                        className={`size-3 rounded-full border-2 transition-all ${enabled ? 'border-transparent' : 'border-text-tertiary'} ${runtime?.sounding ? 'animate-pulse' : ''}`}
                        style={enabled ? { backgroundColor: lookup.climateColor } : undefined}
                      />
                    </button>
                  )
                  const progress =
                    runtime?.playbackStartedAt !== undefined &&
                    runtime.playbackDurationMs !== undefined
                      ? {
                          startedAtMs: runtime.playbackStartedAt,
                          durationMs: runtime.playbackDurationMs,
                        }
                      : undefined
                  return (
                    <ActiveRow
                      key={layer.id}
                      control={control}
                      name={layer.name}
                      detail={
                        runtime?.activeClipId
                          ? layer.clips.find((clip) => clip.id === runtime.activeClipId)?.title
                          : undefined
                      }
                      nowMs={nowMs}
                      progress={progress}
                    />
                  )
                })}
              </ActiveSection>
            )}
          {activeSounds.length > 0 && (
            <ActiveSection
              title="SFX"
              icon={<Zap className="size-3.5" />}
              meter={
                <AudioLevelMeter
                  label="SFX"
                  analyser={() => SoundboardEngine.getInstance().getMeterAnalyser()}
                />
              }
            >
              {activeSounds.map(({ sound, activity }) => (
                <ActiveRow
                  key={sound.id}
                  name={sound.name}
                  detail={activity.voiceCount > 1 ? `×${String(activity.voiceCount)}` : undefined}
                  nowMs={nowMs}
                  progress={
                    activity.startedAtMs !== undefined && activity.durationMs !== undefined
                      ? { startedAtMs: activity.startedAtMs, durationMs: activity.durationMs }
                      : undefined
                  }
                />
              ))}
            </ActiveSection>
          )}
        </div>
      )}
    </SidebarSection>
  )
}
