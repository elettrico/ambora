import { useState } from 'react'
import { Music } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TrackListItem } from '@/components/TrackListItem'
import type { Track } from '@/lib/types'

interface TrackListProps {
  tracks: Track[]
  onDeleteTrack: (trackId: string) => void
  climateColor?: string
  onPlayTrack?: (trackId: string) => void
  onRelocateTrack: (
    trackId: string,
    localFilePath: string,
    fileName: string,
  ) => void | Promise<void>
  onReorderTracks: (trackIds: string[]) => void
}

export function TrackList({
  tracks,
  onDeleteTrack,
  climateColor,
  onPlayTrack,
  onRelocateTrack,
  onReorderTracks,
}: TrackListProps): React.JSX.Element {
  const sorted = [...tracks].sort((a, b) => a.order - b.order)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)

  function handleDrop(targetId: string): void {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragTargetId(null)
      return
    }
    const ids = sorted.map((track) => track.id)
    const from = ids.indexOf(draggedId)
    const to = ids.indexOf(targetId)
    if (from !== -1 && to !== -1) {
      ids.splice(to, 0, ids.splice(from, 1)[0])
      onReorderTracks(ids)
    }
    setDraggedId(null)
    setDragTargetId(null)
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-text-tertiary">
        <Music className="size-8" />
        <p className="text-[13px]">No tracks yet</p>
      </div>
    )
  }

  return (
    <ScrollArea>
      <div className="flex flex-col gap-0.5">
        {sorted.map((track) => (
          <TrackListItem
            key={track.id}
            track={track}
            onDelete={onDeleteTrack}
            climateColor={climateColor}
            onPlay={onPlayTrack}
            onRelocate={onRelocateTrack}
            isDragging={draggedId === track.id}
            isDragTarget={dragTargetId === track.id && draggedId !== track.id}
            onDragStart={setDraggedId}
            onDragOver={setDragTargetId}
            onDrop={handleDrop}
            onDragEnd={() => {
              setDraggedId(null)
              setDragTargetId(null)
            }}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
