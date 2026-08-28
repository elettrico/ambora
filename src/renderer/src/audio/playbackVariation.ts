export const MAX_PITCH_VARIATION = 20

export function clampPitchVariation(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(MAX_PITCH_VARIATION, value ?? 0))
}

/** Returns a fresh playback rate in the symmetric range configured by percent. */
export function randomPlaybackRate(
  variationPercent: number | undefined,
  random: () => number = Math.random,
): number {
  const range = clampPitchVariation(variationPercent) / 100
  return 1 - range + random() * range * 2
}
