import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ColorPicker } from '@/components/ColorPicker'
import { IconPicker } from '@/components/IconPicker'
import { TrackList } from '@/components/TrackList'
import { AddTrackDialog } from '@/components/AddTrackDialog'
import { ICON_MAP, type ClimateIconName } from '@/lib/iconMap'
import { DEFAULTS } from '@/lib/constants'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useCampaignStore } from '@/store/campaignStore'
import type { Climate, Track } from '@/lib/types'
import { toast } from 'sonner'

interface ClimateDetailProps {
  climate: Climate
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClimateDetail({
  climate,
  campaignId,
  open,
  onOpenChange,
}: ClimateDetailProps): React.JSX.Element {
  const { updateClimate, deleteClimate, addTrack, removeTrack } = useCampaignStore()
  const [addTrackOpen, setAddTrackOpen] = useState(false)

  const {
    isEditing: nameIsEditing,
    editValue: nameEditValue,
    setEditValue: setNameEditValue,
    startEditing: startNameEditing,
    handleSave: handleNameSave,
    handleKeyDown: handleNameKeyDown,
    inputProps: nameInputProps,
  } = useInlineEdit({
    value: climate.name,
    onSave: (name) => updateClimate(campaignId, climate.id, { name }),
  })

  const Icon = ICON_MAP[climate.icon as ClimateIconName]

  function handleDeleteClimate(): void {
    deleteClimate(campaignId, climate.id)
    onOpenChange(false)
    toast.success('Climate deleted')
  }

  function handleAddTrack(track: Omit<Track, 'id' | 'order'>): void {
    addTrack(campaignId, climate.id, track)
    toast.success('Track added')
  }

  function handleDeleteTrack(trackId: string): void {
    removeTrack(campaignId, climate.id, trackId)
    toast.success('Track removed')
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] bg-surface-1 sm:max-w-[400px]">
          <SheetHeader>
            <div className="flex items-center gap-2">
              {Icon && <Icon className="size-5" style={{ color: climate.color }} />}
              {nameIsEditing ? (
                <Input
                  {...nameInputProps}
                  value={nameEditValue}
                  onChange={(e) => setNameEditValue(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleNameKeyDown}
                  className="h-8 text-[17px] font-semibold"
                />
              ) : (
                <SheetTitle
                  className="cursor-pointer text-[17px] hover:text-accent"
                  onClick={startNameEditing}
                >
                  {climate.name}
                </SheetTitle>
              )}
            </div>
            <SheetDescription className="sr-only">Edit climate settings</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
                Color
              </p>
              <ColorPicker
                selectedColor={climate.color}
                onSelectColor={(color) => updateClimate(campaignId, climate.id, { color })}
              />
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
                Icon
              </p>
              <IconPicker
                selectedIcon={climate.icon}
                onSelectIcon={(icon) => updateClimate(campaignId, climate.id, { icon })}
              />
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
                Crossfade Duration
              </p>
              <div className="flex items-center gap-3">
                <Slider
                  value={[climate.crossfadeDuration]}
                  min={DEFAULTS.minCrossfade}
                  max={DEFAULTS.maxCrossfade}
                  step={1}
                  onValueChange={([val]) =>
                    updateClimate(campaignId, climate.id, { crossfadeDuration: val })
                  }
                  className="flex-1"
                />
                <span className="w-8 text-right text-[13px] text-text-secondary">
                  {climate.crossfadeDuration}s
                </span>
              </div>
            </div>

            <Separator className="bg-border-subtle" />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
                  Tracks
                </p>
                <Button variant="ghost" size="xs" onClick={() => setAddTrackOpen(true)}>
                  <Plus className="size-3" />
                  Add Track
                </Button>
              </div>
              <TrackList tracks={climate.tracks} onDeleteTrack={handleDeleteTrack} />
            </div>
          </div>

          <SheetFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full text-danger hover:text-danger">
                  Delete Climate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &ldquo;{climate.name}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this climate and all its tracks.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDeleteClimate}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AddTrackDialog
        open={addTrackOpen}
        onOpenChange={setAddTrackOpen}
        onAddTrack={handleAddTrack}
      />
    </>
  )
}
