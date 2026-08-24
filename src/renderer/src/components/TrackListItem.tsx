import { useState } from 'react'
import { GripVertical, Youtube, Music, Trash2, Play, AlertTriangle, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDuration } from '@/lib/utils'
import { useDiagnosticsStore } from '@/store/diagnosticsStore'
import type { Track } from '@/lib/types'

interface TrackListItemProps {
  track: Track
  onDelete: (trackId: string) => void
  climateColor?: string
  onPlay?: (trackId: string) => void
  onRelocate: (trackId: string, localFilePath: string, fileName: string) => void | Promise<void>
  isDragging: boolean
  isDragTarget: boolean
  onDragStart: (trackId: string) => void
  onDragOver: (trackId: string) => void
  onDrop: (trackId: string) => void
  onDragEnd: () => void
}

export function TrackListItem({
  track,
  onDelete,
  climateColor,
  onPlay,
  onRelocate,
  isDragging,
  isDragTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TrackListItemProps): React.JSX.Element {
  const [isRemoving, setIsRemoving] = useState(false)
  const diagnostic = useDiagnosticsStore((s) => s.unplayable[track.id])
  const missingLocalFile = track.source === 'local' && !track.localFilePath?.trim()
  const problemReason = diagnostic?.reason ?? (missingLocalFile ? 'Audio file is missing' : null)

  function handleDelete(): void {
    setIsRemoving(true)
    setTimeout(() => onDelete(track.id), 200)
  }

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', track.id)
        onDragStart(track.id)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'move'
        onDragOver(track.id)
      }}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onDrop(track.id)
      }}
      onDragEnd={onDragEnd}
      className={`group flex h-12 min-w-0 items-center gap-2 rounded-md px-2 transition-colors hover:bg-surface-2 ${
        isDragging ? 'opacity-40' : ''
      } ${isDragTarget ? 'bg-accent-muted ring-1 ring-inset ring-accent/50' : ''}`}
      style={{
        animation: isRemoving
          ? 'track-fade-out 200ms ease-out forwards'
          : 'track-fade-in 200ms ease-out',
      }}
    >
      <GripVertical className="size-3.5 shrink-0 cursor-grab text-text-tertiary active:cursor-grabbing" />
      {onPlay && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          style={{ color: climateColor }}
          onClick={() => onPlay(track.id)}
          aria-label={`Play ${track.title}`}
        >
          <Play className="size-3.5" />
        </Button>
      )}
      {track.source === 'youtube' ? (
        <Youtube className="size-4 shrink-0 text-text-secondary" />
      ) : (
        <Music className="size-4 shrink-0 text-text-secondary" />
      )}
      <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{track.title}</span>
      {problemReason && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {track.source === 'local' ? (
                <button
                  type="button"
                  className="flex size-6 shrink-0 items-center justify-center rounded text-amber-400 hover:bg-amber-500/10"
                  onClick={() => {
                    void window.api.pickAudioFiles({}).then(([file]) => {
                      if (file) void onRelocate(track.id, file.localFilePath, file.name)
                    })
                  }}
                  aria-label={`Relocate ${track.title}: ${problemReason}`}
                >
                  <AlertTriangle className="size-3.5" />
                </button>
              ) : (
                <AlertTriangle
                  className="size-3.5 shrink-0 text-amber-400"
                  aria-label={`Unplayable: ${problemReason}`}
                />
              )}
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="max-w-[280px]">
              <p className="font-medium">This track can&rsquo;t be played</p>
              <p className="text-text-secondary">{problemReason}</p>
              {track.source === 'local' && <p className="text-accent">Click to locate the file</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <span className="shrink-0 text-[13px] text-text-tertiary">
        {formatDuration(track.duration)}
      </span>
      {track.source === 'local' && track.localFilePath && !problemReason && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-text-tertiary opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => window.api.showItemInFolder(track.localFilePath!)}
                aria-label={`Show ${track.title} in folder`}
              >
                <FolderOpen className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Show in folder</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-text-tertiary hover:text-danger"
        onClick={handleDelete}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
