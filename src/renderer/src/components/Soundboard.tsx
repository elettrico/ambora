import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, FolderPlus, Grid3X3, Maximize2, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { SoundboardEngine, type SoundboardActivity } from '@/audio/SoundboardEngine'
import { SoundKey } from '@/components/SoundKey'
import { SoundIconPicker } from '@/components/SoundIconPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ACCEPTED_AUDIO, ACCEPTED_AUDIO_EXTENSIONS, SOUNDBOARD_DEFAULTS } from '@/lib/constants'
import { validateLocalAudioFile } from '@/lib/validateLocalAudio'
import { SOUND_ICON_MAP, type SoundboardIconName } from '@/lib/soundIconMap'
import { useCampaignStore } from '@/store/campaignStore'
import type { Campaign, SoundboardPlaybackMode, SoundboardSound } from '@/lib/types'

interface SoundboardProps {
  campaign: Campaign
}

type PanelMode = 'expanded' | 'compact' | 'hidden'

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() || 'Audio file unavailable'
}

function iconFor(
  name: string | undefined,
): (typeof SOUND_ICON_MAP)[SoundboardIconName] | undefined {
  return name ? SOUND_ICON_MAP[name as SoundboardIconName] : undefined
}

function isLetter(key: string): boolean {
  return /^\p{L}$/u.test(key)
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  )
}

export function Soundboard({ campaign }: SoundboardProps): React.JSX.Element {
  const { addSoundboardSound, updateSoundboardSound, deleteSoundboardSound } = useCampaignStore()
  const sounds = useMemo(
    () => [...(campaign.soundboard ?? [])].sort((a, b) => a.order - b.order),
    [campaign.soundboard],
  )
  const [panelMode, setPanelMode] = useState<PanelMode>(() => {
    const saved = localStorage.getItem('ambora:soundboard-mode')
    return saved === 'compact' || saved === 'hidden' ? saved : 'expanded'
  })
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [activityById, setActivityById] = useState<Record<string, SoundboardActivity>>({})
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const assignedSounds = sounds.filter((sound) => sound.shortcutKey)

  useEffect(() => {
    localStorage.setItem('ambora:soundboard-mode', panelMode)
  }, [panelMode])

  const play = useCallback(async (sound: SoundboardSound, fullVolume = false): Promise<void> => {
    try {
      await SoundboardEngine.getInstance().trigger(sound, fullVolume)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not play ${sound.name}`)
    }
  }, [])

  useEffect(
    () =>
      SoundboardEngine.getInstance().subscribe((soundId, activity) => {
        setActivityById((current) => ({ ...current, [soundId]: activity }))
      }),
    [],
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return

      if (assigningId) {
        event.preventDefault()
        if (event.key === 'Escape') {
          setAssigningId(null)
          return
        }
        const key = event.key.toLocaleLowerCase()
        if (!isLetter(key)) {
          toast.error('Use a letter for sound shortcuts')
          return
        }
        const conflict = sounds.find(
          (sound) => sound.id !== assigningId && sound.shortcutKey === key,
        )
        if (conflict) {
          toast.error(`${key.toLocaleUpperCase()} is already assigned to ${conflict.name}`)
          return
        }
        updateSoundboardSound(campaign.id, assigningId, { shortcutKey: key })
        setAssigningId(null)
        return
      }

      if (isEditableTarget(event.target)) return
      const key = event.key.toLocaleLowerCase()
      if (!isLetter(key)) return
      const sound = sounds.find((item) => item.shortcutKey === key)
      if (!sound) return
      event.preventDefault()
      void play(sound, event.shiftKey)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [assigningId, campaign.id, play, sounds, updateSoundboardSound])

  async function addFiles(files: FileList | File[] | null): Promise<void> {
    if (!files) return
    const audioFiles = Array.from(files).filter((file) => {
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLocaleLowerCase()
      return ACCEPTED_AUDIO_EXTENSIONS.includes(extension)
    })
    const createdIds: string[] = []
    for (const file of audioFiles) {
      const validated = await validateLocalAudioFile(file)
      if (!validated) continue
      const created = addSoundboardSound(campaign.id, {
        name: validated.title.replace(/\.[^.]+$/, ''),
        localFilePath: validated.localFilePath,
        duration: validated.duration,
        volume: SOUNDBOARD_DEFAULTS.volume,
        playbackMode: 'restart',
      })
      if (created) createdIds.push(created.id)
    }
    if (createdIds.length === 1) setAssigningId(createdIds[0])
    if (createdIds.length > 0) {
      toast.success(`${String(createdIds.length)} sound${createdIds.length === 1 ? '' : 's'} added`)
    } else if (audioFiles.length === 0 && files.length > 0) {
      toast.error('No supported audio files found')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  return (
    <section
      className="shrink-0 border-t border-border bg-surface-1"
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragOver(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragOver(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragOver(false)
        void addFiles(event.dataTransfer.files)
      }}
    >
      <TooltipProvider delayDuration={500}>
        <div
          className={`overflow-hidden transition-colors ${isDragOver ? 'bg-accent-muted ring-1 ring-inset ring-accent' : ''}`}
        >
          <div className="flex min-h-10 items-center gap-3 px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">
                Soundboard ({String(sounds.length)})
              </span>
              {panelMode !== 'hidden' && (
                <span className="truncate text-[11px] text-text-tertiary">
                  Letter plays · Shift + letter plays at 100%
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AUDIO}
              multiple
              className="hidden"
              onChange={(event) => void addFiles(event.target.files)}
            />
            <input
              ref={(node) => {
                folderInputRef.current = node
                node?.setAttribute('webkitdirectory', '')
              }}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void addFiles(event.target.files)}
            />
            {panelMode !== 'hidden' && (
              <>
                <Button variant="ghost" size="sm" onClick={() => folderInputRef.current?.click()}>
                  <FolderPlus className="size-4" /> Add folder
                </Button>
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Plus className="size-4" /> Add sound
                </Button>
              </>
            )}
            {panelMode === 'expanded' && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Compact soundboard"
                onClick={() => setPanelMode('compact')}
              >
                <Grid3X3 className="size-4" />
              </Button>
            )}
            {panelMode === 'compact' && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Open soundboard"
                onClick={() => setPanelMode('expanded')}
              >
                <Maximize2 className="size-4" />
              </Button>
            )}
            {panelMode === 'hidden' && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open compact soundboard"
                  onClick={() => setPanelMode('compact')}
                >
                  <Grid3X3 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open full soundboard"
                  onClick={() => setPanelMode('expanded')}
                >
                  <Maximize2 className="size-4" />
                </Button>
              </>
            )}
            {panelMode !== 'hidden' && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Hide soundboard"
                onClick={() => setPanelMode('hidden')}
              >
                <ChevronDown className="size-4" />
              </Button>
            )}
          </div>

          {panelMode === 'expanded' && (
            <div className="max-h-[38vh] overflow-y-auto border-t border-border-subtle">
              {sounds.length === 0 ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-center py-8 text-[13px] text-text-tertiary hover:text-text-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add local one-shot sounds to this campaign
                </button>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))] gap-px bg-border-subtle">
                  {sounds.map((sound) => (
                    <div
                      key={sound.id}
                      className="grid min-h-14 grid-cols-[48px_minmax(80px,1fr)_32px_92px_minmax(80px,140px)_32px_24px] items-center gap-2 bg-surface-1 px-3"
                    >
                      <SoundKey
                        letter={
                          assigningId === sound.id
                            ? '…'
                            : (sound.shortcutKey?.toLocaleUpperCase() ?? 'Set')
                        }
                        activity={activityById[sound.id]}
                        icon={iconFor(sound.icon)}
                        iconColor={sound.iconColor}
                        onClick={() => setAssigningId(sound.id)}
                        aria-label={`Assign letter to ${sound.name}`}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            value={sound.name}
                            className="h-8 border-transparent bg-transparent px-2 text-[13px] hover:border-border focus:border-border"
                            onChange={(event) =>
                              updateSoundboardSound(campaign.id, sound.id, {
                                name: event.target.value,
                              })
                            }
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top">{fileName(sound.localFilePath)}</TooltipContent>
                      </Tooltip>
                      <SoundIconPicker
                        selectedIcon={sound.icon}
                        selectedColor={sound.iconColor}
                        onSelectIcon={(icon) =>
                          updateSoundboardSound(campaign.id, sound.id, { icon })
                        }
                        onSelectColor={(iconColor) =>
                          updateSoundboardSound(campaign.id, sound.id, { iconColor })
                        }
                      />
                      <select
                        value={sound.playbackMode ?? 'restart'}
                        className="h-8 rounded-sm border border-border bg-surface-2 px-2 text-[11px] text-text-secondary"
                        aria-label={`${sound.name} repeat behavior`}
                        onChange={(event) =>
                          updateSoundboardSound(campaign.id, sound.id, {
                            playbackMode: event.target.value as SoundboardPlaybackMode,
                          })
                        }
                      >
                        <option value="ignore">Ignore</option>
                        <option value="stop">Stop</option>
                        <option value="restart">Restart</option>
                        <option value="multiple">Multiple</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[sound.volume]}
                          onValueChange={([volume]) =>
                            updateSoundboardSound(campaign.id, sound.id, { volume })
                          }
                          aria-label={`${sound.name} volume`}
                        />
                        <span className="w-8 text-right text-[11px] tabular-nums text-text-tertiary">
                          {sound.volume}%
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Play ${sound.name}`}
                        onClick={() => void play(sound)}
                      >
                        <Play className="size-4 fill-current" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-text-tertiary hover:text-danger"
                        aria-label={`Delete ${sound.name}`}
                        onClick={() => deleteSoundboardSound(campaign.id, sound.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {panelMode === 'compact' && (
            <div className="border-t border-border-subtle p-3">
              {assignedSounds.length > 0 ? (
                <div className="grid w-fit max-w-full grid-cols-[repeat(6,44px)] gap-2">
                  {assignedSounds.map((sound) => (
                    <Tooltip key={sound.id}>
                      <TooltipTrigger asChild>
                        <SoundKey
                          letter={sound.shortcutKey?.toLocaleUpperCase() ?? ''}
                          activity={activityById[sound.id]}
                          icon={iconFor(sound.icon)}
                          iconColor={sound.iconColor}
                          size="large"
                          onClick={(event) => void play(sound, event.shiftKey)}
                          aria-label={`Play ${sound.name}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {sound.name} · {fileName(sound.localFilePath)}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ) : (
                <span className="text-[12px] text-text-tertiary">No letters assigned yet</span>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    </section>
  )
}
