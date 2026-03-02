import { useState } from 'react'
import { Download, MoreVertical, Plus, AlertTriangle } from 'lucide-react'
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
import { serializeCampaignForExport, deserializeCampaignFromImport } from '@/lib/campaignExport'
import type { Campaign } from '@/lib/types'
import { AmboraLogo } from './AmboraLogo'
import { QRCodePanel } from './QRCodePanel'

function CampaignItem({
  campaign,
  isActive,
  onSelect,
}: {
  campaign: Campaign
  isActive: boolean
  onSelect: () => void
}): React.JSX.Element {
  const { id, name } = campaign
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

  async function handleExport(): Promise<void> {
    try {
      const appVersion = await window.api.getAppVersion()
      const json = serializeCampaignForExport(campaign, appVersion)
      const suggestedName = `${campaign.name.replace(/[^a-zA-Z0-9 _-]/g, '')}.ambora`
      const saved = await window.api.exportCampaign(json, suggestedName)
      if (saved) toast.success('Campaign exported')
    } catch {
      toast.error('Failed to export campaign')
    }
  }

  function handleDelete(): void {
    deleteCampaign(id)
    toast.success('Campaign deleted')
  }

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-1 overflow-hidden rounded-md px-3 py-2 text-[14px] transition-colors',
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
              className="shrink-0 text-text-tertiary hover:text-text-primary"
            >
              <MoreVertical className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right">
            <DropdownMenuItem onClick={startRenameEditing}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport}>Export</DropdownMenuItem>
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
  const { campaigns, activeCampaignId, setActiveCampaign, createCampaign, importCampaign } =
    useCampaignStore()
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [importPreview, setImportPreview] = useState<{
    campaign: Campaign
    warnings: string[]
  } | null>(null)

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

  async function handleImportFile(): Promise<void> {
    try {
      const raw = await window.api.importCampaign()
      if (!raw) return
      const result = deserializeCampaignFromImport(raw)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setImportPreview({ campaign: result.campaign, warnings: result.warnings })
    } catch {
      toast.error('Failed to read import file')
    }
  }

  function handleConfirmImport(): void {
    if (!importPreview) return
    importCampaign(importPreview.campaign)
    setActiveCampaign(importPreview.campaign.id)
    toast.success(`Imported "${importPreview.campaign.name}"`)
    setImportPreview(null)
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

      <ScrollArea className="flex-1 px-2 [&_[data-slot=scroll-area-viewport]>div]:!block">
        <div className="flex flex-col gap-0.5">
          {campaigns.map((c) => (
            <CampaignItem
              key={c.id}
              campaign={c}
              isActive={c.id === activeCampaignId}
              onSelect={() => setActiveCampaign(c.id)}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="flex flex-col gap-0.5 px-3 py-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-text-secondary"
          onClick={() => setNewDialogOpen(true)}
        >
          <Plus className="size-4" />
          New Campaign
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-text-secondary"
          onClick={handleImportFile}
        >
          <Download className="size-4" />
          Import Campaign
        </Button>
      </div>

      <QRCodePanel />

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

      <Dialog
        open={importPreview !== null}
        onOpenChange={(open) => !open && setImportPreview(null)}
      >
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Import Campaign</DialogTitle>
            <DialogDescription>Review the campaign before importing.</DialogDescription>
          </DialogHeader>
          {importPreview && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-[14px] font-medium text-text-primary">
                  {importPreview.campaign.name}
                </p>
                {importPreview.campaign.description && (
                  <p className="text-[13px] text-text-secondary">
                    {importPreview.campaign.description}
                  </p>
                )}
                <p className="text-[13px] text-text-secondary">
                  {importPreview.campaign.climates.length} climate
                  {importPreview.campaign.climates.length !== 1 ? 's' : ''}
                  {' / '}
                  {importPreview.campaign.climates.reduce(
                    (sum, cl) => sum + cl.tracks.length,
                    0,
                  )}{' '}
                  track
                  {importPreview.campaign.climates.reduce(
                    (sum, cl) => sum + cl.tracks.length,
                    0,
                  ) !== 1
                    ? 's'
                    : ''}
                </p>
              </div>
              {importPreview.warnings.length > 0 && (
                <div className="flex flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-amber-400">
                    <AlertTriangle className="size-4" />
                    Warnings
                  </div>
                  <ul className="flex flex-col gap-1">
                    {importPreview.warnings.map((w) => (
                      <li key={w} className="text-[12px] text-amber-300/80">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
