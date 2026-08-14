import { useState } from 'react'
import { CircleOff, RotateCcw, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CLIMATE_COLORS, SOUNDBOARD_ICONS } from '@/lib/constants'
import { SOUND_ICON_MAP, type SoundboardIconName } from '@/lib/soundIconMap'
import { cn } from '@/lib/utils'

interface SoundIconPickerProps {
  selectedIcon?: string
  selectedColor?: string
  onSelectIcon: (icon: string | undefined) => void
  onSelectColor: (color: string | undefined) => void
}

export function SoundIconPicker({
  selectedIcon,
  selectedColor,
  onSelectIcon,
  onSelectColor,
}: SoundIconPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const SelectedIcon = selectedIcon ? SOUND_ICON_MAP[selectedIcon as SoundboardIconName] : undefined
  const visibleIcons = SOUNDBOARD_ICONS.filter((name) =>
    name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery('')
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={selectedIcon ? 'text-accent' : 'text-text-tertiary'}
          aria-label="Choose sound icon"
        >
          {SelectedIcon ? (
            <SelectedIcon className="size-4" style={{ color: selectedColor }} />
          ) : (
            <Sparkles className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[360px] w-[272px] p-2">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-2 left-2 size-4 text-text-tertiary" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search icons…"
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="grid grid-cols-6 gap-1">
          <button
            type="button"
            title="No icon"
            className={cn(
              'flex size-9 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-3',
              !selectedIcon && 'bg-accent-muted text-accent',
            )}
            onClick={() => {
              onSelectIcon(undefined)
              setOpen(false)
            }}
          >
            <CircleOff className="size-4" />
          </button>
          {visibleIcons.map((iconName) => {
            const Icon = SOUND_ICON_MAP[iconName]
            return (
              <button
                key={iconName}
                type="button"
                title={iconName}
                className={cn(
                  'flex size-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-3',
                  selectedIcon === iconName && 'bg-accent-muted text-accent',
                )}
                onClick={() => {
                  onSelectIcon(iconName)
                }}
              >
                <Icon className="size-4" />
              </button>
            )
          })}
        </div>
        <div className="mt-2 border-t border-border-subtle pt-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
            Icon color
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              title="Use default color"
              className="flex size-7 items-center justify-center rounded-full border border-border text-text-tertiary hover:text-text-primary"
              onClick={() => onSelectColor(undefined)}
            >
              <RotateCcw className="size-3.5" />
            </button>
            {CLIMATE_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                title={color.name}
                className="size-7 rounded-full border-2"
                style={{
                  backgroundColor: color.hex,
                  borderColor:
                    selectedColor?.toLocaleLowerCase() === color.hex.toLocaleLowerCase()
                      ? 'var(--color-text-primary)'
                      : 'transparent',
                }}
                onClick={() => onSelectColor(color.hex)}
              />
            ))}
            <label
              className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-border"
              title="Custom color"
            >
              <span className="absolute inset-1 rounded-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" />
              <input
                type="color"
                value={selectedColor ?? '#7B93F5'}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Custom icon color"
                onChange={(event) => onSelectColor(event.target.value)}
              />
            </label>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
