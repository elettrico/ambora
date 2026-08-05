import { describe, it, expect } from 'vitest'
import { evaluateCodecAllowlist, reasonForCodec } from '../../src/main/audioProbe'

describe('evaluateCodecAllowlist', () => {
  it('accepts common Chromium-playable codecs', () => {
    for (const codec of ['mp3', 'flac', 'vorbis', 'opus', 'pcm_s16le', 'pcm_f32le', 'aac']) {
      const result = evaluateCodecAllowlist(codec)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.codec).toBe(codec)
    }
  })

  it('rejects MPEG Layer I/II', () => {
    expect(evaluateCodecAllowlist('mp2').ok).toBe(false)
    expect(evaluateCodecAllowlist('mp1').ok).toBe(false)
    expect(evaluateCodecAllowlist('mpga').ok).toBe(false)
  })

  it('rejects ADPCM WAV codecs with a clear reason', () => {
    const result = evaluateCodecAllowlist('adpcm_ms')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toMatch(/WAV|PCM|MP3|FLAC/i)
    }
  })

  it('rejects missing codec', () => {
    expect(evaluateCodecAllowlist(null).ok).toBe(false)
    expect(evaluateCodecAllowlist('').ok).toBe(false)
  })

  it('reasonForCodec returns null for allowed codecs', () => {
    expect(reasonForCodec('mp3')).toBeNull()
  })
})
