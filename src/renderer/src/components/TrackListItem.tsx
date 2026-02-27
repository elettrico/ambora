import { GripVertical, Youtube, Music, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/utils'
import type { Track } from '@/lib/types'

interface TrackListItemProps {
  track: Track
  onDelete: (trackId: string) => void
}

export function TrackListItem({ track, onDelete }: TrackListItemProps): React.JSX.Element {
  return (
    <div className="group flex h-12 min-w-0 items-center gap-2 rounded-md px-2 hover:bg-surface-2">
      <GripVertical className="size-3.5 shrink-0 text-text-tertiary" />
      {track.source === 'youtube' ? (
        <Youtube className="size-4 shrink-0 text-text-secondary" />
      ) : (
        <Music className="size-4 shrink-0 text-text-secondary" />
      )}
      <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{track.title}</span>
      <span className="shrink-0 text-[13px] text-text-tertiary">
        {formatDuration(track.duration)}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-text-tertiary hover:text-danger"
        onClick={() => onDelete(track.id)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
