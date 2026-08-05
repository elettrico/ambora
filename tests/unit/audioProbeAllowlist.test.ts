import { describe, it, expect } from 'vitest'
import {
  evaluateCodecAllowlist,
  reasonForCodec,
  parseFfmpegProbeStderr,
} from '../../src/main/audioProbe'

describe('evaluateCodecAllowlist', () => {
  it('accepts common Chromium-playable codecs', () => {
    for (const codec of [
      'mp3',
      'flac',
      'vorbis',
      'opus',
      'pcm_s16le',
      'pcm_f32le',
      'pcm_s24le',
      'aac',
    ]) {
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

describe('parseFfmpegProbeStderr', () => {
  it('parses pcm_s24le stereo duration from ffmpeg -i output', () => {
    const stderr = `
Input #0, wav, from 'track.wav':
  Duration: 00:04:51.69, bitrate: 2304 kb/s
  Stream #0:0: Audio: pcm_s24le ([1][0][0][0] / 0x0001), 48000 Hz, 2 channels, s32 (24 bit), 2304 kb/s
`
    const info = parseFfmpegProbeStderr(stderr)
    expect(info.codec).toBe('pcm_s24le')
    expect(info.channels).toBe(2)
    expect(info.durationSec).toBeCloseTo(291.69, 2)
  })

  it('parses stereo keyword and aac codec', () => {
    const stderr = `
  Duration: 00:03:10.05, start: 0.000000, bitrate: 128 kb/s
  Stream #0:0[0x1](eng): Audio: aac (LC), 44100 Hz, stereo, fltp, 128 kb/s
`
    const info = parseFfmpegProbeStderr(stderr)
    expect(info.codec).toBe('aac')
    expect(info.channels).toBe(2)
    expect(info.durationSec).toBeCloseTo(190.05, 2)
  })
})
