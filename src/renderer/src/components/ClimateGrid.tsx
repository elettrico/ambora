import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { ClimateCard } from '@/components/ClimateCard'
import { ClimateDetail } from '@/components/ClimateDetail'
import { ACCEPTED_AUDIO_EXTENSIONS } from '@/lib/constants'
import { useCampaignStore } from '@/store/campaignStore'
import { useAudioStore } from '@/store/audioStore'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { DEFAULTS } from '@/lib/constants'
import type { Campaign } from '@/lib/types'
import { toast } from 'sonner'
import { validateLocalAudioFile } from '@/lib/validateLocalAudio'
import { probeLocalTrack } from '@/audio/probeTrack'
import { useDiagnosticsStore } from '@/store/diagnosticsStore'

interface ClimateGridProps {
  campaign: Campaign
}

export function ClimateGrid({ campaign }: ClimateGridProps): React.JSX.Element {
  const { createClimate, duplicateClimate, addTrack, reorderClimates } = useCampaignStore()
  const { activeClimateId, isPlaying, fadeAnimations, clearAllFadeAnimations } = useAudioStore()
  const audioEngine = useAudioEngine()
  const [selectedClimateId, setSelectedClimateId] = useState<string | null>(null)
  const [draggedClimateId, setDraggedClimateId] = useState<string | null>(null)
  const [reorderTargetId, setReorderTargetId] = useState<string | null>(null)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sorted = [...campaign.climates].sort((a, b) => a.order - b.order)
  const selectedClimate = sorted.find((c) => c.id === selectedClimateId)
  const canAdd = campaign.climates.length < DEFAULTS.maxClimates

  // Safety timer: clear fade animations if they overshoot
  useEffect(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }
    if (fadeAnimations.length === 0) return
    const maxDuration = Math.max(...fadeAnimations.map((fa) => fa.durationMs))
    safetyTimerRef.current = setTimeout(() => {
      clearAllFadeAnimations()
    }, maxDuration + 500)
    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current)
      }
    }
  }, [fadeAnimations, clearAllFadeAnimations])

  // Probe every local asset while the grid is visible so warning badges do not
  // depend on the GM opening each climate first. The diagnostics store dedupes
  // files already checked during this session.
  useEffect(() => {
    const localTracks = campaign.climates.flatMap((climate) =>
      climate.tracks
        .filter((track) => track.source === 'local')
        .map((track) => ({ id: track.id, localFilePath: track.localFilePath ?? '' })),
    )
    const ambientClips = campaign.climates.flatMap((climate) =>
      (climate.ambientLayers ?? []).flatMap((layer) =>
        layer.clips.map((clip) => ({ id: clip.id, localFilePath: clip.localFilePath })),
      ),
    )
    const toProbe = [...localTracks, ...ambientClips].filter(
      (asset) => !useDiagnosticsStore.getState().hasProbed(asset.id),
    )
    if (toProbe.length === 0) return

    void (async () => {
      for (const asset of toProbe) {
        const store = useDiagnosticsStore.getState()
        if (store.hasProbed(asset.id)) continue
        store.markProbed(asset.id)
        const { ok, reason } = await probeLocalTrack(asset.localFilePath)
        if (!ok) {
          store.setUnplayable(asset.id, {
            source: 'probe',
            reason: reason ?? 'File could not be opened',
          })
        } else if (store.unplayable[asset.id]?.source === 'probe') {
          store.clearUnplayable(asset.id)
        }
      }
    })()
  }, [campaign.climates])

  function handleAddClimate(): void {
    const climate = createClimate(campaign.id, 'New Climate')
    if (climate) {
      setSelectedClimateId(climate.id)
    } else {
      toast.error(`Maximum of ${DEFAULTS.maxClimates} climates reached`)
    }
  }

  function handleDuplicateClimate(climateId: string): void {
    const duplicate = duplicateClimate(campaign.id, climateId)
    if (!duplicate) {
      toast.error(`Maximum of ${DEFAULTS.maxClimates} climates reached`)
      return
    }
    setSelectedClimateId(duplicate.id)
    toast.success('Climate duplicated')
  }

  async function handleDropFiles(climateId: string, files: File[]): Promise<void> {
    const audioFiles = files.filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      return ACCEPTED_AUDIO_EXTENSIONS.includes(ext)
    })
    let added = 0
    for (const file of audioFiles) {
      const validated = await validateLocalAudioFile(file)
      if (!validated) continue
      addTrack(campaign.id, climateId, {
        source: 'local',
        title: validated.title,
        localFilePath: validated.localFilePath,
        duration: validated.duration,
      })
      added++
    }
    if (added > 0) {
      toast.success(`${added} track${added > 1 ? 's' : ''} added`)
    }
  }

  function handleReorderDrop(targetClimateId: string): void {
    if (!draggedClimateId || draggedClimateId === targetClimateId) {
      setDraggedClimateId(null)
      setReorderTargetId(null)
      return
    }
    const ids = sorted.map((climate) => climate.id)
    const sourceIndex = ids.indexOf(draggedClimateId)
    const targetIndex = ids.indexOf(targetClimateId)
    if (sourceIndex < 0 || targetIndex < 0) return
    ids.splice(sourceIndex, 1)
    ids.splice(Math.min(targetIndex, ids.length), 0, draggedClimateId)
    reorderClimates(campaign.id, ids)
    setDraggedClimateId(null)
    setReorderTargetId(null)
  }

  if (selectedClimate) {
    return (
      <ClimateDetail
        climate={selectedClimate}
        campaign={campaign}
        onClose={() => setSelectedClimateId(null)}
        onDuplicate={() => handleDuplicateClimate(selectedClimate.id)}
      />
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 px-8 pb-8">
      {sorted.map((climate) => (
        <ClimateCard
          key={climate.id}
          campaignId={campaign.id}
          climate={climate}
          isActive={climate.id === activeClimateId && isPlaying}
          isSelected={false}
          fadeAnimation={fadeAnimations.find((fa) => fa.climateId === climate.id)}
          onClick={() => setSelectedClimateId(climate.id)}
          onPlay={() => audioEngine.activateClimate(climate)}
          onDuplicate={() => handleDuplicateClimate(climate.id)}
          onDropFiles={handleDropFiles}
          isReordering={draggedClimateId !== null}
          isReorderTarget={reorderTargetId === climate.id && draggedClimateId !== climate.id}
          onReorderDragStart={setDraggedClimateId}
          onReorderDragEnter={setReorderTargetId}
          onReorderDrop={handleReorderDrop}
          onReorderDragEnd={() => {
            setDraggedClimateId(null)
            setReorderTargetId(null)
          }}
        />
      ))}
      {canAdd && (
        <button
          type="button"
          className="flex min-h-[120px] min-w-[200px] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border text-text-tertiary transition-colors duration-150 hover:border-text-tertiary hover:text-text-secondary"
          onClick={handleAddClimate}
        >
          <Plus className="size-6" />
          <span className="text-[13px]">Add Climate</span>
        </button>
      )}
    </div>
  )
}
