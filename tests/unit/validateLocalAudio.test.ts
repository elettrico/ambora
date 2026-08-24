import { beforeEach, describe, expect, it, vi } from 'vitest'

const probeAudioFile = vi.fn()
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

beforeEach(() => {
  probeAudioFile.mockReset()
  vi.stubGlobal('window', { api: { probeAudioFile } })
})

describe('validateLocalAudioPath', () => {
  it('validates a native-picker path without requiring a browser File', async () => {
    probeAudioFile.mockResolvedValue({ ok: true, durationSec: 7.5 })
    const { validateLocalAudioPath } = await import('../../src/renderer/src/lib/validateLocalAudio')

    await expect(validateLocalAudioPath('/audio/reveal.mp3', 'reveal.mp3')).resolves.toEqual({
      localFilePath: '/audio/reveal.mp3',
      title: 'reveal.mp3',
      duration: 7.5,
    })
  })

  it('rejects a path that the audio probe cannot open', async () => {
    probeAudioFile.mockResolvedValue({ ok: false, reason: 'File not found' })
    const { validateLocalAudioPath } = await import('../../src/renderer/src/lib/validateLocalAudio')

    await expect(validateLocalAudioPath('/gone.wav', 'gone.wav')).resolves.toBeNull()
  })
})
