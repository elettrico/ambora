/**
 * Validate a local audio file for import via main-process FFmpeg allowlist.
 * Returns a duration when FFmpeg reports one; otherwise falls back to the
 * Chromium metadata probe used elsewhere.
 */

import { toast } from 'sonner'
import { getLocalFileDuration } from '@/lib/utils'

export interface ValidatedLocalAudio {
  localFilePath: string
  title: string
  duration: number | undefined
}

/**
 * Probe + duration for one File. On failure, toasts the reason and returns null
 * so callers can skip that file without aborting a multi-file drop.
 */
export async function validateLocalAudioFile(file: File): Promise<ValidatedLocalAudio | null> {
  const localFilePath = window.api.getPathForFile(file)
  return validateLocalAudioPath(localFilePath, file.name)
}

export async function validateLocalAudioPath(
  localFilePath: string,
  fileName: string,
): Promise<ValidatedLocalAudio | null> {
  const probe = await window.api.probeAudioFile(localFilePath)
  if (!probe.ok) {
    toast.error(`Skipping "${fileName}": ${probe.reason}`)
    return null
  }

  const duration = probe.durationSec ?? (await getLocalFileDuration(localFilePath)) ?? undefined

  return { localFilePath, title: fileName, duration }
}
