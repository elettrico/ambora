import type { SoundboardSound } from '@/lib/types'

export function activeShortcutAssignment(
  assigningId: string | null,
  sounds: SoundboardSound[],
): string | null {
  return assigningId && sounds.some((sound) => sound.id === assigningId) ? assigningId : null
}
