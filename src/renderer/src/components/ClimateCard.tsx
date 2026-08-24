import { useState } from 'react'
import { Play, AlertTriangle } from 'lucide-react'
import { ICON_MAP, type ClimateIconName } from '@/lib/iconMap'
import { ACCEPTED_AUDIO_EXTENSIONS } from '@/lib/constants'
import { useDiagnosticsStore } from '@/store/diagnosticsStore'
import { useAudioStore } from '@/store/audioStore'
import { AmbientEngine } from '@/audio/AmbientEngine'
import { climateAudioIssues } from '@/lib/climateAudioIssues'
import type { Climate } from '@/lib/types'
import type { FadeAnimation } from '@/store/audioStore'

interface ClimateCardProps {
  climate: Climate
  isActive: boolean
  isSelected: boolean
  fadeAnimation?: FadeAnimation
  onClick: () => void
  onPlay: () => void
  onDropFiles: (climateId: string, files: File[]) => void | Promise<void>
  isReordering: boolean
  isReorderTarget: boolean
  onReorderDragStart: (climateId: string) => void
  onReorderDragEnter: (climateId: string) => void
  onReorderDrop: (climateId: string) => void
  onReorderDragEnd: () => void
}

function hasAudioFiles(dt: DataTransfer): boolean {
  for (const item of Array.from(dt.items)) {
    if (item.kind === 'file') {
      const ext = '.' + (item.type.split('/')[1] || '').toLowerCase()
      // Also check by common mime subtypes
      if (
        ACCEPTED_AUDIO_EXTENSIONS.some((ae) => ext === ae || item.type === `audio/${ae.slice(1)}`)
      ) {
        return true
      }
      // Fallback: allow any file during dragover, filter on drop
      return true
    }
  }
  return false
}

export function ClimateCard({
  climate,
  isActive,
  isSelected,
  fadeAnimation,
  onClick,
  onPlay,
  onDropFiles,
  isReordering,
  isReorderTarget,
  onReorderDragStart,
  onReorderDragEnter,
  onReorderDrop,
  onReorderDragEnd,
}: ClimateCardProps): React.JSX.Element {
  const Icon = ICON_MAP[climate.icon as ClimateIconName]
  const showGlow = isActive || fadeAnimation?.direction === 'out'
  const unplayable = useDiagnosticsStore((s) => s.unplayable)
  const [isDragOver, setIsDragOver] = useState(false)
  const ambientLayerCount = (climate.ambientLayers ?? []).length
  const ambientRuntime = useAudioStore((s) => s.ambientRuntime)
  const oneShotLayers = (climate.ambientLayers ?? [])
    .filter((layer) => layer.mode === 'oneshot' || layer.mode === 'sequence')
    .sort((a, b) => a.order - b.order)
  const issues = climateAudioIssues(climate, unplayable)
  // A climate can be ambience only — wind and birds with no score.
  const canPlay = climate.tracks.length > 0 || ambientLayerCount > 0

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    if (isReordering) {
      e.dataTransfer.dropEffect = 'move'
      return
    }
    if (hasAudioFiles(e.dataTransfer)) {
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }

  function handleDragEnter(e: React.DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    if (isReordering) {
      onReorderDragEnter(climate.id)
      return
    }
    if (!hasAudioFiles(e.dataTransfer)) return
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    // Only leave if we're leaving the card entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (isReordering) {
      onReorderDrop(climate.id)
      return
    }

    const files = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      return ACCEPTED_AUDIO_EXTENSIONS.includes(ext)
    })

    if (files.length > 0) {
      onDropFiles(climate.id, files)
    }
  }

  return (
    <article
      draggable
      className="group relative flex min-h-[120px] min-w-[200px] flex-col justify-between overflow-hidden rounded-md bg-surface-2 p-4 text-left transition-colors duration-150 hover:bg-surface-3"
      style={{
        borderLeft: `3px solid ${climate.color}B3`,
        outline: isReorderTarget
          ? `2px dashed ${climate.color}`
          : isSelected
            ? `2px solid ${climate.color}`
            : undefined,
        outlineOffset: isReorderTarget || isSelected ? '-2px' : undefined,
      }}
      onDragStart={(e) => {
        if ((e.target as HTMLElement).closest('[data-no-climate-drag]')) {
          e.preventDefault()
          return
        }
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('application/x-ambora-climate', climate.id)
        onReorderDragStart(climate.id)
      }}
      onDragEnd={() => {
        setIsDragOver(false)
        onReorderDragEnd()
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 rounded-md"
        aria-label={`${climate.name}, ${climate.tracks.length} ${climate.tracks.length === 1 ? 'track' : 'tracks'}${isActive ? ', playing' : ''}`}
        onClick={onClick}
      />
      {/* Glow overlay — always rendered, opacity transitions via CSS */}
      <span
        className="pointer-events-none absolute inset-0 rounded-md"
        style={{
          boxShadow: `inset 0 0 0 1px ${climate.color}80`,
          opacity: showGlow ? 1 : 0,
          transition: 'opacity 400ms ease-out',
        }}
      />

      {/* Drag-over overlay */}
      {isDragOver && (
        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-accent bg-accent-muted/30">
          <span className="text-[12px] font-medium text-accent">Drop to add tracks</span>
        </span>
      )}

      <div className="pointer-events-none relative z-[1] flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-6" style={{ color: climate.color }} />}
          <span className="text-[14px] font-semibold text-text-primary">{climate.name}</span>
          {/* Pulse dot — always rendered, opacity transitions */}
          <span
            className={`size-2 shrink-0 rounded-full ${isActive ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: climate.color,
              opacity: isActive ? 1 : 0,
              transition: 'opacity 400ms ease-out',
            }}
          />
        </div>
        <div className="flex items-center gap-2 pl-8">
          <span className="text-[11px] text-text-tertiary">
            {climate.tracks.length} {climate.tracks.length === 1 ? 'track' : 'tracks'}
            {ambientLayerCount > 0 && ` · ${ambientLayerCount} ambient`}
          </span>
          {issues.total > 0 && (
            <button
              type="button"
              data-no-climate-drag
              className="pointer-events-auto flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/20"
              title={issues.summary}
              aria-label={`Audio warning: ${issues.summary}`}
              onClick={(event) => {
                event.stopPropagation()
                onClick()
              }}
            >
              <AlertTriangle className="size-3" />
              {issues.total}
            </button>
          )}
        </div>
      </div>
      <div className="relative z-[1] flex flex-col gap-1.5">
        {isActive &&
          oneShotLayers.map((layer) => {
            const runtime = ambientRuntime[layer.id]
            const showProgress =
              runtime?.sounding &&
              runtime.playbackStartedAt !== undefined &&
              runtime.playbackDurationMs !== undefined
            return (
              <button
                key={layer.id}
                type="button"
                data-no-climate-drag
                disabled={layer.clips.length === 0}
                className="relative flex min-h-8 w-full items-center gap-2 overflow-hidden rounded bg-surface-3 px-2.5 text-[12px] text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation()
                  AmbientEngine.getInstance().triggerLayer(layer.id)
                }}
              >
                <Play className="size-3.5 shrink-0" style={{ color: climate.color }} />
                <span className="truncate">{layer.name}</span>
                {showProgress && (
                  <span
                    key={runtime.playbackStartedAt}
                    className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left"
                    style={{
                      backgroundColor: climate.color,
                      animation: `bar-drain ${String(runtime.playbackDurationMs)}ms linear forwards`,
                    }}
                  />
                )}
              </button>
            )
          })}
        <div className="flex justify-end">
          {canPlay && (
            <button
              type="button"
              data-no-climate-drag
              aria-label={`Play ${climate.name}`}
              className="flex size-8 items-center justify-center rounded-full opacity-0 transition-opacity duration-150 hover:brightness-125 group-hover:opacity-100"
              style={{ backgroundColor: `${climate.color}33` }}
              onClick={(e) => {
                e.stopPropagation()
                onPlay()
              }}
            >
              <Play className="size-4" style={{ color: climate.color }} />
            </button>
          )}
        </div>
      </div>

      {/* Crossfade progress bar */}
      {fadeAnimation && (
        <span
          key={fadeAnimation.startedAt}
          className="pointer-events-none absolute bottom-0 left-0 h-[3px]"
          style={{
            backgroundColor: `${climate.color}CC`,
            boxShadow: `0 0 6px ${climate.color}80`,
            animation: `${fadeAnimation.direction === 'in' ? 'bar-fill' : 'bar-drain'} ${fadeAnimation.durationMs}ms linear forwards`,
          }}
        />
      )}
    </article>
  )
}
