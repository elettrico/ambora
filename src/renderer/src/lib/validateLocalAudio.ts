/**
 * Validate a local audio file for import via main-process ffprobe allowlist.
 * Returns a duration when ffprobe reports one; otherwise falls back to the
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
  const probe = await window.api.probeAudioFile(localFilePath)
  if (!probe.ok) {
    toast.error(`Skipping "${file.name}": ${probe.reason}`)
    return null
  }

  const duration = probe.durationSec ?? (await getLocalFileDuration(localFilePath)) ?? undefined

  return { localFilePath, title: file.name, duration }
}
