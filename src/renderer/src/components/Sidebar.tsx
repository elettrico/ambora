import { useState } from 'react'
import { MoreVertical, Plus, Smartphone } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCampaignStore } from '@/store/campaignStore'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AmboraLogo } from './AmboraLogo'

function CampaignItem({
  id,
  name,
  isActive,
  onSelect,
}: {
  id: string
  name: string
  isActive: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { updateCampaign, deleteCampaign } = useCampaignStore()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const {
    isEditing: renameIsEditing,
    editValue: renameEditValue,
    setEditValue: setRenameEditValue,
    startEditing: startRenameEditing,
    handleSave: handleRenameSave,
    handleKeyDown: handleRenameKeyDown,
    inputProps: renameInputProps,
  } = useInlineEdit({
    value: name,
    onSave: (newName) => updateCampaign(id, { name: newName }),
  })

  function handleDelete(): void {
    deleteCampaign(id)
    toast.success('Campaign deleted')
  }

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-2 rounded-md px-3 py-2 text-[14px] transition-colors',
          isActive ? 'bg-accent-muted text-text-primary' : 'text-text-secondary hover:bg-surface-3',
        )}
      >
        {renameIsEditing ? (
          <Input
            {...renameInputProps}
            value={renameEditValue}
            onChange={(e) => setRenameEditValue(e.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={handleRenameKeyDown}
            className="h-6 flex-1 text-[14px]"
          />
        ) : (
          <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={onSelect}>
            {name}
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right">
            <DropdownMenuItem onClick={startRenameEditing}>Rename</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this campaign and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function Sidebar(): React.JSX.Element {
  const { campaigns, activeCampaignId, setActiveCampaign, createCampaign } = useCampaignStore()
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  function handleCreate(): void {
    const trimmed = newName.trim()
    if (!trimmed) return
    const campaign = createCampaign(trimmed, newDescription.trim() || undefined)
    setActiveCampaign(campaign.id)
    setNewName('')
    setNewDescription('')
    setNewDialogOpen(false)
    toast.success('Campaign created')
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border-subtle bg-surface-1">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <AmboraLogo size={32} />
        <h1 className="text-[22px] font-light tracking-[0.25em] text-text-primary opacity-95">
          AMBORA
        </h1>
      </div>

      <div className="px-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
          Campaigns
        </p>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-0.5">
          {campaigns.map((c) => (
            <CampaignItem
              key={c.id}
              id={c.id}
              name={c.name}
              isActive={c.id === activeCampaignId}
              onSelect={() => setActiveCampaign(c.id)}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="px-3 py-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-text-secondary"
          onClick={() => setNewDialogOpen(true)}
        >
          <Plus className="size-4" />
          New Campaign
        </Button>
      </div>

      <div className="mt-auto border-t border-border-subtle p-4">
        <div className="rounded-md bg-surface-2 p-4">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-text-tertiary" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
              Connect Phone
            </p>
          </div>
          <p className="mt-1 text-[11px] text-text-tertiary">Start server in settings</p>
        </div>
      </div>

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>Create a new campaign to organize your climates.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-name">Name</Label>
              <Input
                id="campaign-name"
                placeholder="Campaign name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-desc">Description (optional)</Label>
              <Input
                id="campaign-desc"
                placeholder="A brief description..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
