/**
 * Resolve path to the bundled ffmpeg binary.
 *
 * In development it lives under node_modules. In a packaged app electron-builder
 * unpacks it next to the asar (`app.asar.unpacked`) so it remains executable.
 *
 * Import probing and LUFS analysis both use this binary (we no longer ship
 * ffprobe-static — its darwin/arm64 build was an x86_64 binary and broke Apple
 * Silicon imports).
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
