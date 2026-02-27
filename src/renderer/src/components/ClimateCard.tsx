import { ICON_MAP, type ClimateIconName } from '@/lib/iconMap'
import type { Climate } from '@/lib/types'

interface ClimateCardProps {
  climate: Climate
  onClick: () => void
}

export function ClimateCard({ climate, onClick }: ClimateCardProps): React.JSX.Element {
  const Icon = ICON_MAP[climate.icon as ClimateIconName]

  return (
    <button
      type="button"
      className="flex min-h-[120px] min-w-[200px] flex-col justify-between rounded-md bg-surface-2 p-4 text-left transition-colors duration-150 hover:bg-surface-3"
      style={{ borderLeft: `3px solid ${climate.color}B3` }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-6" style={{ color: climate.color }} />}
        <span className="text-[14px] font-semibold text-text-primary">{climate.name}</span>
      </div>
      <span className="text-[11px] text-text-tertiary">
        {climate.tracks.length} {climate.tracks.length === 1 ? 'track' : 'tracks'}
      </span>
    </button>
  )
}
