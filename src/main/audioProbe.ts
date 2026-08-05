/**
 * Codec/format probe for local audio import validation.
 *
 * Uses the bundled ffmpeg binary (not ffprobe-static): the darwin/arm64
 * ffprobe-static artifact is actually an x86_64 binary, which fails to spawn on
 * Apple Silicon without Rosetta (errno -86) and blocks every local import.
 *
 * Allowlist is tuned to what Chromium's media pipeline typically accepts for
 * Ambora's <audio> / decodeAudioData paths — not every codec FFmpeg can decode.
 */

import { spawn } from 'node:child_process'
import type { AudioProbeResult } from '../shared/audioTools'
import { getFfmpegPath } from './ffmpegPaths'

/** Codecs Chromium is expected to play via local-audio:// for music/ambient. */
export const ALLOWED_AUDIO_CODECS = new Set([
  // MPEG Layer III
  'mp3',
  'mp3float',
  // Lossless / common PCM
  'flac',
  'pcm_s16le',
  'pcm_s16be',
  'pcm_s24le',
  'pcm_s24be',
  'pcm_s32le',
  'pcm_s32be',
  'pcm_f32le',
  'pcm_f32be',
  'pcm_f64le',
  'pcm_u8',
  'pcm_s8',
  // Ogg / WebM family
  'vorbis',
  'opus',
  // AAC in m4a (extension may be filtered by UI, but probe stays honest)
  'aac',
  'aac_latm',
])

/** Explicitly called out — common "looks like mp3" failures. */
const REJECTED_CODEC_REASONS: Record<string, string> = {
  mp1: 'MPEG Audio Layer I is not supported — convert to MP3 (Layer III), FLAC, or WAV',
  mp2: 'MPEG Audio Layer II is not supported — convert to MP3 (Layer III), FLAC, or WAV',
  mpga: 'MPEG Audio Layer I/II is not supported — convert to MP3 (Layer III), FLAC, or WAV',
}

export function reasonForCodec(codec: string): string | null {
  const key = codec.toLowerCase()
  if (ALLOWED_AUDIO_CODECS.has(key)) return null
  if (REJECTED_CODEC_REASONS[key]) return REJECTED_CODEC_REASONS[key]
  if (key.startsWith('adpcm_')) {
    return `WAV codec "${codec}" is not supported — use PCM WAV, FLAC, or MP3`
  }
  if (key.startsWith('pcm_')) {
    return `PCM format "${codec}" is not supported — use 16/24/32-bit or float PCM WAV`
  }
  return `Audio codec "${codec}" is not supported — use MP3, FLAC, OGG/Opus, or PCM WAV`
}

/** Pure allowlist decision for unit tests. */
export function evaluateCodecAllowlist(codec: string | undefined | null): AudioProbeResult {
  if (!codec || codec.trim() === '') {
    return { ok: false, reason: 'No audio stream found in this file' }
  }
  const reason = reasonForCodec(codec)
  if (reason) return { ok: false, reason }
  return { ok: true, codec }
}

export interface FfmpegProbeInfo {
  codec?: string
  channels?: number
  durationSec?: number
}

/**
 * Parse stream metadata from `ffmpeg -i` stderr.
 * Exported for unit tests.
 */
export function parseFfmpegProbeStderr(stderr: string): FfmpegProbeInfo {
  // Stream #0:0: Audio: pcm_s24le ([1][0][0][0] / 0x0001), 48000 Hz, 2 channels, ...
  // Stream #0:0[0x1](eng): Audio: aac (LC), 44100 Hz, stereo, fltp
  const audioMatch = /Stream #\d+:\d+(?:\[[^\]]*\])?(?:\([^)]*\))?: Audio:\s*([a-zA-Z0-9_]+)/.exec(
    stderr,
  )
  const codec = audioMatch?.[1]

  let channels: number | undefined
  const channelsMatch = /,\s*(\d+)\s+channels?/.exec(stderr)
  if (channelsMatch) {
    channels = Number(channelsMatch[1])
  } else if (/,\s*mono,/i.test(stderr)) {
    channels = 1
  } else if (/,\s*stereo,/i.test(stderr)) {
    channels = 2
  }

  let durationSec: number | undefined
  const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
  if (durationMatch) {
    const hours = Number(durationMatch[1])
    const minutes = Number(durationMatch[2])
    const seconds = Number(durationMatch[3])
    const total = hours * 3600 + minutes * 60 + seconds
    if (Number.isFinite(total) && total > 0) durationSec = total
  }

  return { codec, channels, durationSec }
}

function runFfmpegProbe(filePath: string): Promise<FfmpegProbeInfo> {
  return new Promise((resolve, reject) => {
    let ffmpegPath: string
    try {
      ffmpegPath = getFfmpegPath()
    } catch (error) {
      reject(error instanceof Error ? error : new Error('ffmpeg unavailable'))
      return
    }

    // -t 0 avoids decoding the whole file; we only need container/stream headers.
    const args = ['-hide_banner', '-i', filePath, '-t', '0', '-f', 'null', '-']
    const child = spawn(ffmpegPath, args, { windowsHide: true })
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (c: string) => {
      stderr += c
    })
    child.stdout.resume()
    child.on('error', reject)
    child.on('close', () => {
      // ffmpeg often exits non-zero when probing; stderr still has the metadata.
      if (/Invalid data found|No such file|Permission denied|Error opening/i.test(stderr)) {
        reject(new Error(stderr.trim().split('\n').pop() || 'ffmpeg could not open file'))
        return
      }
      const info = parseFfmpegProbeStderr(stderr)
      if (!info.codec) {
        reject(new Error(stderr.trim() || 'ffmpeg produced no audio stream info'))
        return
      }
      resolve(info)
    })
  })
}

export async function probeAudioFile(filePath: string): Promise<AudioProbeResult> {
  let info: FfmpegProbeInfo
  try {
    info = await runFfmpegProbe(filePath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      reason: detail.includes('Invalid data')
        ? 'Could not read this audio file — it may be corrupt or an unsupported container'
        : `Could not probe audio file: ${detail}`,
    }
  }

  const base = evaluateCodecAllowlist(info.codec)
  if (!base.ok) return base

  return {
    ok: true,
    codec: base.codec,
    channels: info.channels,
    durationSec: info.durationSec,
  }
}
