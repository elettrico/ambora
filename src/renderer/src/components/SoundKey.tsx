import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { SoundboardActivity } from '@/audio/SoundboardEngine'
import { cn } from '@/lib/utils'

interface SoundKeyProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  letter: string
  activity?: SoundboardActivity
  icon?: LucideIcon
  iconColor?: string
  size?: 'normal' | 'large'
  ref?: React.Ref<HTMLButtonElement>
}

const RADIUS = 17
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function SoundKey({
  letter,
  activity,
  icon: Icon,
  iconColor,
  size = 'normal',
  className,
  ref,
  ...props
}: SoundKeyProps): React.JSX.Element {
  const [now, setNow] = useState(() => Date.now())
  const playing = activity?.playing ?? false

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const update = (): void => {
      setNow(Date.now())
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [playing, activity?.startedAtMs])

  const elapsed = now - (activity?.startedAtMs ?? now)
  const progress = activity?.durationMs
    ? Math.min(1, Math.max(0, elapsed / activity.durationMs))
    : 0
  const pixels = size === 'large' ? 48 : 40

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors',
        playing ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
        className,
      )}
      style={{ width: pixels, height: pixels }}
      {...props}
    >
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
        <circle
          cx="20"
          cy="20"
          r={RADIUS}
          fill={playing ? 'var(--color-accent-muted)' : 'var(--color-surface-2)'}
          stroke="var(--color-border)"
          strokeWidth="4"
        />
        {playing && activity?.durationMs && (
          <circle
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        )}
        {playing && !activity?.durationMs && (
          <circle
            className="origin-center animate-[spin_5s_linear_infinite] motion-reduce:animate-none"
            cx="20"
            cy="20"
            r={RADIUS}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE / 2} ${CIRCUMFERENCE / 2}`}
          />
        )}
      </svg>
      {Icon ? (
        <>
          <Icon className="relative z-10 size-5" style={{ color: iconColor }} aria-hidden="true" />
          <span className="absolute -top-1 -left-1 z-20 min-w-4 rounded-full border border-border bg-surface-3 px-1 text-[9px] leading-[14px] font-bold text-text-primary">
            {letter}
          </span>
        </>
      ) : (
        <span className="relative z-10">{letter}</span>
      )}
      {(activity?.voiceCount ?? 0) > 1 && (
        <span className="absolute -top-1 -right-1 z-20 rounded-full bg-accent px-1 text-[9px] leading-4 font-bold text-background">
          ×{activity?.voiceCount}
        </span>
      )}
    </button>
  )
}
