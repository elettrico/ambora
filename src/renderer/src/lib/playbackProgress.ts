import { formatDuration } from '@/lib/utils'

/**
 * Fraction of the track elapsed, clamped to 0..1.
 *
 * Returns null when there is nothing honest to draw — unknown, zero, negative
 * or non-finite duration (YouTube before playback starts; a VBR MP3 reporting
 * Infinity) — so the caller hides the bar rather than pinning it at 0%.
 */
export function progressFraction(
  positionSec: number,
  durationSec: number | undefined,
): number | null {
  if (durationSec === undefined || !Number.isFinite(durationSec) || durationSec <= 0) return null
  if (!Number.isFinite(positionSec)) return null
  if (positionSec <= 0) return 0
  if (positionSec >= durationSec) return 1
  return positionSec / durationSec
}

/**
 * The `1:37 / 2:51` readout. The position is clamped to the duration because a
 * media element can report a currentTime a few milliseconds past a stale
 * duration at the end of a track, which would otherwise render `2:52 / 2:51`.
 */
export function formatProgressText(positionSec: number, durationSec: number | undefined): string {
  const clamped =
    durationSec !== undefined && Number.isFinite(durationSec) && positionSec > durationSec
      ? durationSec
      : positionSec
  return `${formatDuration(clamped)} / ${formatDuration(durationSec)}`
}
