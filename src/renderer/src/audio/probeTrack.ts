/**
 * Proactive decodability probe for local audio files via main-process ffprobe
 * (same allowlist as import). Avoids spinning up HTMLAudioElements on climate
 * open, which contended with playback on the shared local-audio:// token URL.
 *
 * Deeper Chromium-only decode failures are still caught reactively at playback.
 */

export interface ProbeResult {
  ok: boolean
  reason?: string
}

// Kept for unit tests / MediaError mapping used by older HTMLAudio probes.
export interface MediaErrorLike {
  code?: number
  message?: string
}

/**
 * Pure mapping from a load outcome to a ProbeResult, split out from the DOM so it
 * is unit-testable. A timeout is treated as inconclusive (ok) so a slow disk never
 * produces a false "unplayable".
 */
export function resultForOutcome(
  outcome: 'loadedmetadata' | 'error' | 'timeout',
  error?: MediaErrorLike | null,
): ProbeResult {
  if (outcome !== 'error') return { ok: true }
  const message = error?.message?.trim()
  const reason =
    message && message.length > 0 ? message : `Audio error (code ${error?.code ?? '?'})`
  return { ok: false, reason }
}

export async function probeLocalTrack(filePath: string): Promise<ProbeResult> {
  if (!filePath) {
    return { ok: false, reason: 'This clip has no audio file yet — re-add it after importing' }
  }
  const result = await window.api.probeAudioFile(filePath)
  if (result.ok) return { ok: true }
  return { ok: false, reason: result.reason }
}
