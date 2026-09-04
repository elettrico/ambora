import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/store/audioStore'
import { AudioEngine } from '@/audio/AudioEngine'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const CANVAS_CSS_W = 60
const CANVAS_CSS_H = 4
const CANVAS_PX_W = CANVAS_CSS_W * 2
const CANVAS_PX_H = CANVAS_CSS_H * 2

/**
 * Canvas and imperative `.style` writes bypass Tailwind entirely, so this meter
 * can't get its colours from utilities the way the rest of the renderer does.
 * Inline styles below use `var(--token)` directly; the canvas needs a resolved
 * value, so it reads the same custom property the utilities compile to.
 *
 * Resolved per activation rather than at module load, so a palette swap is
 * picked up on the next track instead of requiring a reload.
 */
function readThemeColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const SMOOTHING_ATTACK = 0.6
const SMOOTHING_RELEASE = 0.4

/** Meter refresh — 10–15fps is enough for this indicator and cuts renderer work. */
const METER_FRAME_MS = 1000 / 12

export function NormalizationIndicator(): React.JSX.Element | null {
  const isPlaying = useAudioStore((s) => s.isPlaying)
  const activeTrackId = useAudioStore((s) => s.activeTrackId)

  const badgeRef = useRef<HTMLSpanElement>(null)
  const gainRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const smoothedLevel = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const timeDomainBuffer = useRef<Float32Array<ArrayBuffer> | null>(null)
  const lastPaintMs = useRef(0)
  const gradientRef = useRef<CanvasGradient | null>(null)

  useEffect(() => {
    if (!isPlaying || !activeTrackId) return

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    smoothedLevel.current = 0
    lastPaintMs.current = 0
    gradientRef.current = null
    const accent = readThemeColor('--accent')

    function tick(now: number): void {
      const engine = AudioEngine.getInstance()
      const info = engine.getNormalizationInfo()

      // Update badge
      if (badgeRef.current) {
        const label = info.type === 'lufs' ? 'LUFS' : info.type === 'agc' ? 'AGC' : ''
        if (badgeRef.current.textContent !== label) {
          badgeRef.current.textContent = label
        }
      }

      // Update gain label
      if (gainRef.current) {
        if (info.type === 'none') {
          gainRef.current.textContent = ''
        } else {
          const db = info.gainDb
          const sign = db >= 0.05 ? '+' : ''
          const text = `${sign}${db.toFixed(1)} dB`
          if (gainRef.current.textContent !== text) {
            gainRef.current.textContent = text
          }
          if (db > 0.05) {
            gainRef.current.style.color = 'var(--accent)'
          } else if (db < -0.05) {
            gainRef.current.style.color = 'var(--text-secondary)'
          } else {
            gainRef.current.style.color = 'var(--text-tertiary)'
          }
        }
      }

      // Update canvas level meter
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let rawLevel = 0

      if (info.analyser) {
        if (
          !timeDomainBuffer.current ||
          timeDomainBuffer.current.length !== info.analyser.fftSize
        ) {
          timeDomainBuffer.current = new Float32Array(info.analyser.fftSize)
        }
        info.analyser.getFloatTimeDomainData(timeDomainBuffer.current)
        let sum = 0
        for (let i = 0; i < timeDomainBuffer.current.length; i++) {
          sum += timeDomainBuffer.current[i] * timeDomainBuffer.current[i]
        }
        rawLevel = Math.sqrt(sum / timeDomainBuffer.current.length)
        rawLevel = Math.min(1, rawLevel / 0.2)
      } else if (info.type === 'agc') {
        const linearGain = Math.pow(10, info.gainDb / 20)
        rawLevel = Math.min(1, Math.abs(1 - linearGain) * 5)
      }

      const coeff = rawLevel > smoothedLevel.current ? SMOOTHING_ATTACK : SMOOTHING_RELEASE
      smoothedLevel.current += (rawLevel - smoothedLevel.current) * coeff

      const shouldPaint =
        isReducedMotion || now - lastPaintMs.current >= METER_FRAME_MS || lastPaintMs.current === 0

      if (shouldPaint) {
        lastPaintMs.current = now
        ctx.clearRect(0, 0, CANVAS_PX_W, CANVAS_PX_H)

        if (isReducedMotion) {
          ctx.fillStyle = accent
          ctx.beginPath()
          ctx.arc(CANVAS_PX_H / 2, CANVAS_PX_H / 2, CANVAS_PX_H / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const fillWidth = smoothedLevel.current * CANVAS_PX_W
          if (fillWidth > 0) {
            if (!gradientRef.current) {
              const gradient = ctx.createLinearGradient(0, 0, CANVAS_PX_W, 0)
              gradient.addColorStop(0, accent)
              gradient.addColorStop(1, `color-mix(in srgb, ${accent} 25%, transparent)`)
              gradientRef.current = gradient
            }
            ctx.fillStyle = gradientRef.current
            const r = CANVAS_PX_H / 2
            ctx.beginPath()
            ctx.roundRect(0, 0, fillWidth, CANVAS_PX_H, r)
            ctx.fill()
          }
        }
      }

      if (isReducedMotion) {
        timeoutRef.current = setTimeout(() => tick(performance.now()), 500)
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    if (isReducedMotion) {
      timeoutRef.current = setTimeout(() => tick(performance.now()), 100)
    } else {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isPlaying, activeTrackId])

  if (!isPlaying || !activeTrackId) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-2"
            style={{ animation: 'text-fade-in 300ms ease-out' }}
          >
            <span
              ref={badgeRef}
              className="rounded-full bg-surface-3 px-1.5 py-px text-[10px] font-medium leading-none text-text-secondary"
            />
            <span
              ref={gainRef}
              className="text-[11px] tabular-nums text-text-tertiary"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
            <canvas
              ref={canvasRef}
              width={CANVAS_PX_W}
              height={CANVAS_PX_H}
              style={{ width: CANVAS_CSS_W, height: CANVAS_CSS_H }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Volume normalization active
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
