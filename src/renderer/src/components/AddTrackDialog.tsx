import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Track } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddTrackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddTrack: (track: Omit<Track, 'id' | 'order'>) => void
}

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/

function extractVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX)
  return match ? match[1] : null
}

const ACCEPTED_AUDIO = '.mp3,.wav,.ogg,.flac'

export function AddTrackDialog({
  open,
  onOpenChange,
  onAddTrack,
}: AddTrackDialogProps): React.JSX.Element {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const videoId = extractVideoId(youtubeUrl)
  const isValidYoutube = videoId !== null

  function handleAddYoutube(): void {
    if (!videoId) return
    onAddTrack({
      source: 'youtube',
      title: `YouTube - ${videoId}`,
      youtubeUrl,
      youtubeVideoId: videoId,
    })
    setYoutubeUrl('')
    onOpenChange(false)
  }

  function handleFiles(files: FileList | null): void {
    if (!files) return
    for (const file of Array.from(files)) {
      const filePath = (file as File & { path?: string }).path ?? file.name
      onAddTrack({
        source: 'local',
        title: file.name,
        localFilePath: filePath,
      })
    }
    onOpenChange(false)
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Track</DialogTitle>
          <DialogDescription>Add a YouTube video or local audio file.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="youtube">
          <TabsList className="w-full">
            <TabsTrigger value="youtube" className="flex-1">
              YouTube
            </TabsTrigger>
            <TabsTrigger value="local" className="flex-1">
              Local File
            </TabsTrigger>
          </TabsList>
          <TabsContent value="youtube" className="mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValidYoutube) handleAddYoutube()
                }}
              />
              <Button onClick={handleAddYoutube} disabled={!isValidYoutube}>
                Add
              </Button>
            </div>
            {youtubeUrl && !isValidYoutube && (
              <p className="mt-2 text-[13px] text-danger">Invalid YouTube URL</p>
            )}
          </TabsContent>
          <TabsContent value="local" className="mt-4">
            <button
              type="button"
              className={cn(
                'flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors',
                isDragOver
                  ? 'border-accent bg-accent-muted'
                  : 'border-border hover:border-text-tertiary',
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="size-6 text-text-tertiary" />
              <span className="text-[13px] text-text-secondary">
                Drop audio files here or click to browse
              </span>
              <span className="text-[11px] text-text-tertiary">MP3, WAV, OGG, FLAC</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AUDIO}
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
