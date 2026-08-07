/**
 * Parse a delay-seconds field after the user finishes editing.
 * Returns null for empty/non-numeric input so the caller can revert.
 */
export function parseDelaySec(raw: string, bounds: { min: number; max: number }): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(parsed)))
}
