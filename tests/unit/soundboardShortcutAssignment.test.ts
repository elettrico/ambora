import { describe, expect, it } from 'vitest'
import type { SoundboardSound } from '../../src/shared/types'
import { activeShortcutAssignment } from '../../src/renderer/src/lib/soundboardShortcuts'

function sound(id: string, shortcutKey?: string): SoundboardSound {
  return {
    id,
    name: id,
    localFilePath: `/sounds/${id}.wav`,
    volume: 80,
    order: 0,
    playbackMode: 'restart',
    shortcutKey,
  }
}

describe('soundboard shortcut assignment', () => {
  it('cancels assignment when the pending sound has been deleted', () => {
    const sounds = [sound('existing', 'x')]

    expect(activeShortcutAssignment('deleted', sounds)).toBeNull()
  })

  it('keeps assignment active while the pending sound still exists', () => {
    const sounds = [sound('pending'), sound('existing', 'x')]

    expect(activeShortcutAssignment('pending', sounds)).toBe('pending')
  })
})
