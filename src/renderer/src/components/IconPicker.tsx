import { CLIMATE_ICONS } from '@/lib/constants'
import { ICON_MAP, type ClimateIconName } from '@/lib/iconMap'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  selectedIcon: string
  onSelectIcon: (icon: string) => void
}

export function IconPicker({ selectedIcon, onSelectIcon }: IconPickerProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-5 gap-2">
      {CLIMATE_ICONS.map((iconName) => {
        const Icon = ICON_MAP[iconName as ClimateIconName]
        if (!Icon) return null
        return (
          <button
            key={iconName}
            type="button"
            title={iconName}
            className={cn(
              'flex size-9 items-center justify-center rounded-md transition-colors duration-100',
              selectedIcon === iconName
                ? 'bg-accent-muted text-accent'
                : 'text-text-secondary hover:bg-surface-3',
            )}
            onClick={() => onSelectIcon(iconName)}
          >
            <Icon className="size-5" />
          </button>
        )
      })}
    </div>
  )
}
