/**
 * Resolve paths to the bundled ffmpeg / ffprobe binaries.
 *
 * In development they live under node_modules. In a packaged app electron-builder
 * unpacks them next to the asar (`app.asar.unpacked`) so they remain executable.
 */

import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

// Main process is bundled as CJS by electron-vite; __dirname is available at runtime.
const require = createRequire(join(__dirname, 'ffmpegPaths.js'))

function unpackAsarPath(p: string): string {
  return p.replace('app.asar', 'app.asar.unpacked')
}

function firstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return null
}

export function getFfmpegPath(): string {
  const raw = require('ffmpeg-static') as string | null
  if (!raw) {
    throw new Error('ffmpeg-static binary path is unavailable')
  }

  const candidates = [
    unpackAsarPath(raw),
    raw,
    join(process.resourcesPath, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
  ]

  const found = firstExisting(candidates)
  if (!found) {
    throw new Error(`ffmpeg binary not found (tried: ${candidates.join(', ')})`)
  }
  return found
}

export function getFfprobePath(): string {
  const mod = require('ffprobe-static') as { path: string }
  const raw = mod.path
  if (!raw) {
    throw new Error('ffprobe-static binary path is unavailable')
  }

  const candidates = [
    unpackAsarPath(raw),
    raw,
    join(
      process.resourcesPath,
      'ffprobe',
      process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe',
    ),
  ]

  const found = firstExisting(candidates)
  if (!found) {
    throw new Error(`ffprobe binary not found (tried: ${candidates.join(', ')})`)
  }
  return found
}
