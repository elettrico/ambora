import { Play } from 'lucide-react'
import { ICON_MAP, type ClimateIconName } from '@/lib/iconMap'
import type { Climate } from '@/lib/types'
import type { FadeAnimation } from '@/store/audioStore'

interface ClimateCardProps {
  climate: Climate
  isActive: boolean
  fadeAnimation?: FadeAnimation
  onClick: () => void
  onPlay: () => void
}

export function ClimateCard({
  climate,
  isActive,
  fadeAnimation,
  onClick,
  onPlay,
}: ClimateCardProps): React.JSX.Element {
  const Icon = ICON_MAP[climate.icon as ClimateIconName]
  const showGlow = isActive || fadeAnimation?.direction === 'out'

  return (
    <button
      type="button"
      className="group relative flex min-h-[120px] min-w-[200px] flex-col justify-between overflow-hidden rounded-md bg-surface-2 p-4 text-left transition-colors duration-150 hover:bg-surface-3"
      style={{
        borderLeft: `3px solid ${climate.color}B3`,
      }}
      onClick={onClick}
    >
      {/* Glow overlay — always rendered, opacity transitions via CSS */}
      <span
        className="pointer-events-none absolute inset-0 rounded-md"
        style={{
          boxShadow: `inset 0 0 0 1px ${climate.color}80`,
          opacity: showGlow ? 1 : 0,
          transition: 'opacity 400ms ease-out',
        }}
      />

      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-6" style={{ color: climate.color }} />}
        <span className="text-[14px] font-semibold text-text-primary">{climate.name}</span>
        {/* Pulse dot — always rendered, opacity transitions */}
        <span
          className={`size-2 shrink-0 rounded-full ${isActive ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: climate.color,
            opacity: isActive ? 1 : 0,
            transition: 'opacity 400ms ease-out',
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-tertiary">
          {climate.tracks.length} {climate.tracks.length === 1 ? 'track' : 'tracks'}
        </span>
        {climate.tracks.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            className="flex size-8 items-center justify-center rounded-full opacity-0 transition-opacity duration-150 hover:brightness-125 group-hover:opacity-100"
            style={{ backgroundColor: `${climate.color}33` }}
            onClick={(e) => {
              e.stopPropagation()
              onPlay()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                e.preventDefault()
                onPlay()
              }
            }}
          >
            <Play className="size-4" style={{ color: climate.color }} />
          </span>
        )}
      </div>

      {/* Crossfade progress bar */}
      {fadeAnimation && (
        <span
          key={fadeAnimation.startedAt}
          className="pointer-events-none absolute bottom-0 left-0 h-[3px]"
          style={{
            backgroundColor: `${climate.color}CC`,
            boxShadow: `0 0 6px ${climate.color}80`,
            animation: `${fadeAnimation.direction === 'in' ? 'bar-fill' : 'bar-drain'} ${fadeAnimation.durationMs}ms linear forwards`,
          }}
        />
      )}
    </button>
  )
}
