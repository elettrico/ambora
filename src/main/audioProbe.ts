/**
 * ffprobe-based codec/format probe for local audio import validation.
 *
 * Allowlist is tuned to what Chromium's media pipeline typically accepts for
 * Ambora's <audio> / decodeAudioData paths — not every codec FFmpeg can decode.
 */

import { spawn } from 'node:child_process'
import type { AudioProbeResult } from '../shared/audioTools'
import { getFfprobePath } from './ffmpegPaths'

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

interface FfprobeStream {
  codec_type?: string
  codec_name?: string
  sample_fmt?: string
  channels?: number
  duration?: string
}

interface FfprobeJson {
  streams?: FfprobeStream[]
  format?: { duration?: string }
}

function runFfprobeJson(filePath: string): Promise<FfprobeJson> {
  return new Promise((resolve, reject) => {
    let ffprobePath: string
    try {
      ffprobePath = getFfprobePath()
    } catch (error) {
      reject(error instanceof Error ? error : new Error('ffprobe unavailable'))
      return
    }

    const args = [
      '-v',
      'error',
      '-select_streams',
      'a:0',
      '-show_entries',
      'stream=codec_type,codec_name,sample_fmt,channels,duration:format=duration',
      '-of',
      'json',
      filePath,
    ]

    const child = spawn(ffprobePath, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (c: string) => {
      stdout += c
    })
    child.stderr.on('data', (c: string) => {
      stderr += c
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `ffprobe exited with code ${String(code)}`))
        return
      }
      try {
        resolve(JSON.parse(stdout) as FfprobeJson)
      } catch {
        reject(new Error('ffprobe returned invalid JSON'))
      }
    })
  })
}

export async function probeAudioFile(filePath: string): Promise<AudioProbeResult> {
  let json: FfprobeJson
  try {
    json = await runFfprobeJson(filePath)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      reason: detail.includes('Invalid data')
        ? 'Could not read this audio file — it may be corrupt or an unsupported container'
        : `Could not probe audio file: ${detail}`,
    }
  }

  const stream =
    json.streams?.find((s) => s.codec_type === 'audio') ?? json.streams?.[0] ?? undefined
  const codec = stream?.codec_name
  const base = evaluateCodecAllowlist(codec)
  if (!base.ok) return base

  const durationRaw = stream?.duration ?? json.format?.duration
  const durationSec = durationRaw !== undefined ? Number(durationRaw) : undefined

  return {
    ok: true,
    codec: base.codec,
    sampleFmt: stream?.sample_fmt,
    channels: stream?.channels,
    durationSec:
      durationSec !== undefined && Number.isFinite(durationSec) && durationSec > 0
        ? durationSec
        : undefined,
  }
}
