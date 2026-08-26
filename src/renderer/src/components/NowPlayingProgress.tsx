import { useEffect, useRef } from 'react'
import { AudioEngine } from '@/audio/AudioEngine'
import { useAudioStore } from '@/store/audioStore'
import { formatProgressText, progressFraction } from '@/lib/playbackProgress'

/**
 * 4Hz. The mm:ss readout only changes once a second, and the bar moves ~0.5%
 * per second on a typical track — far below one device pixel per frame — so the
 * CSS transition below interpolates between samples on the compositor instead
 * of us burning 60 main-thread ticks a second in an audio-heavy renderer.
 * Deliberately matches the engine's own POSITION_POLL_MS.
 */
const PROGRESS_TICK_MS = 250
/** Reduced motion: nothing is interpolated, so a 1Hz poll is all mm:ss needs. */
const REDUCED_MOTION_TICK_MS = 1000

const BAR_TRANSITION = `transform ${PROGRESS_TICK_MS}ms linear`

interface NowPlayingProgressProps {
  /**
   * Duration from the persisted track metadata, used only while the player
   * cannot report one itself — YouTube's first seconds, or a VBR MP3 whose
   * media element reports Infinity even though the import-time probe resolved
   * the real length.
   */
  fallbackDurationSec?: number
}

/**
 * Read-only playback progress for the desktop Now Playing bar. No seeking.
 *
 * The 2px bar is absolutely positioned against the Now Playing bar ROOT, which
 * must carry `relative`. It is rendered from inside the track-info flex group
 * only so that a single tick loop can drive both the bar and the readout — an
 * absolutely positioned child is not a flex item, so it costs no layout and
 * `gap-3` does not apply to it. Do not add `relative` to any wrapper between
 * this component and the Now Playing bar root.
 */
export function NowPlayingProgress({
  fallbackDurationSec,
}: NowPlayingProgressProps): React.JSX.Element | null {
  const activeTrackId = useAudioStore((s) => s.activeTrackId)
  const isPlaying = useAudioStore((s) => s.isPlaying)

  const barRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const lastPaintMs = useRef(0)
  const lastFraction = useRef(-1)
  const lastText = useRef('')

  useEffect(() => {
    if (!activeTrackId) return

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    lastPaintMs.current = 0
    lastFraction.current = -1
    lastText.current = ''

    function paint(): void {
      const progress = AudioEngine.getInstance().getPlaybackProgress()
      const duration = progress?.durationSec ?? fallbackDurationSec
      const fraction = progress ? progressFraction(progress.positionSec, duration) : null

      const bar = barRef.current
      if (bar) {
        const next = fraction ?? 0
        if (next !== lastFraction.current) {
          // Never animate backwards: a track change or a restored climate
          // snapshot would otherwise slide the bar across the whole window.
          bar.style.transition =
            isReducedMotion || next < lastFraction.current ? 'none' : BAR_TRANSITION
          bar.style.transform = `scaleX(${next})`
          lastFraction.current = next
        }
      }

      const text = textRef.current
      if (text) {
        const value = progress === null ? '' : formatProgressText(progress.positionSec, duration)
        if (value !== lastText.current) {
          text.textContent = value
          lastText.current = value
        }
      }
    }

    // Paint once immediately so a paused track shows its frozen position
    // without waiting for (or running) a loop.
    paint()

    if (!isPlaying) return

    function tick(now: number): void {
      if (now - lastPaintMs.current >= PROGRESS_TICK_MS) {
        lastPaintMs.current = now
        paint()
      }
      if (isReducedMotion) {
        timeoutRef.current = setTimeout(() => tick(performance.now()), REDUCED_MOTION_TICK_MS)
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    if (isReducedMotion) {
      timeoutRef.current = setTimeout(() => tick(performance.now()), REDUCED_MOTION_TICK_MS)
    } else {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [activeTrackId, isPlaying, fallbackDurationSec])

  if (!activeTrackId) return null

  return (
    <>
      <span
        ref={barRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] origin-left bg-accent"
        style={{ transform: 'scaleX(0)' }}
      />
      <span
        ref={textRef}
        className="shrink-0 text-[11px] tabular-nums text-text-tertiary"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      />
    </>
  )
}
