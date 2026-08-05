/**
 * Main-process integrated loudness analysis via FFmpeg's ebur128 filter.
 *
 * Runs off the renderer thread as a subprocess. Concurrency is capped at 1;
 * superseded jobs are cancelled by killing the child (or dropping from the queue).
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { LUFS_ANALYSIS_SECONDS, type LufsAnalyzeResult } from '../shared/audioTools'
import { getFfmpegPath } from './ffmpegPaths'

/** Exported for unit tests — parses ebur128 Summary "I:" line from stderr. */
export function parseEbur128Integrated(stderr: string): number | null {
  // Prefer the Summary block's Integrated loudness I: value. Fall back to the
  // last standalone "I:" LUFS line if Summary framing differs across builds.
  const summaryMatch = /Summary:[\s\S]*?Integrated loudness:\s*I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/i.exec(
    stderr,
  )
  if (summaryMatch) {
    const value = Number(summaryMatch[1])
    return Number.isFinite(value) ? value : null
  }

  let last: number | null = null
  const lineRe = /^\s*I:\s*(-?\d+(?:\.\d+)?)\s*LUFS\s*$/gim
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(stderr)) !== null) {
    const value = Number(m[1])
    if (Number.isFinite(value)) last = value
  }
  return last
}

interface Job {
  id: string
  filePath: string
  resolve: (result: LufsAnalyzeResult) => void
  child: ChildProcessWithoutNullStreams | null
  cancelled: boolean
}

const queue: Job[] = []
let active: Job | null = null

function settle(job: Job, result: LufsAnalyzeResult): void {
  if (job.cancelled && result.ok) {
    job.resolve({ ok: false, reason: 'cancelled', cancelled: true })
    return
  }
  job.resolve(result)
}

function pump(): void {
  if (active || queue.length === 0) return
  const job = queue.shift()!
  if (job.cancelled) {
    settle(job, { ok: false, reason: 'cancelled', cancelled: true })
    pump()
    return
  }
  active = job
  runJob(job)
}

function runJob(job: Job): void {
  let ffmpegPath: string
  try {
    ffmpegPath = getFfmpegPath()
  } catch (error) {
    active = null
    settle(job, {
      ok: false,
      reason: error instanceof Error ? error.message : 'ffmpeg unavailable',
    })
    pump()
    return
  }

  const args = [
    '-hide_banner',
    '-nostats',
    '-t',
    String(LUFS_ANALYSIS_SECONDS),
    '-i',
    job.filePath,
    '-af',
    'ebur128=framelog=verbose',
    '-f',
    'null',
    '-',
  ]

  let stderr = ''
  let child: ChildProcessWithoutNullStreams
  try {
    child = spawn(ffmpegPath, args, { windowsHide: true })
  } catch (error) {
    active = null
    settle(job, {
      ok: false,
      reason: error instanceof Error ? error.message : 'failed to spawn ffmpeg',
    })
    pump()
    return
  }

  job.child = child
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk
  })
  // Drain stdout so the pipe never blocks.
  child.stdout.resume()

  child.on('error', (error) => {
    if (active === job) active = null
    settle(job, { ok: false, reason: error.message })
    pump()
  })

  child.on('close', (code, signal) => {
    if (active === job) active = null
    job.child = null

    if (job.cancelled || signal === 'SIGTERM' || signal === 'SIGKILL') {
      settle(job, { ok: false, reason: 'cancelled', cancelled: true })
      pump()
      return
    }

    const integrated = parseEbur128Integrated(stderr)
    if (integrated === null) {
      settle(job, {
        ok: false,
        reason:
          code === 0
            ? 'Could not parse loudness from ffmpeg output'
            : `ffmpeg exited with code ${String(code ?? '?')}`,
      })
    } else {
      settle(job, { ok: true, integratedLufs: integrated })
    }
    pump()
  })
}

export function analyzeLufs(filePath: string, requestId: string): Promise<LufsAnalyzeResult> {
  return new Promise((resolve) => {
    const job: Job = {
      id: requestId,
      filePath,
      resolve,
      child: null,
      cancelled: false,
    }
    queue.push(job)
    pump()
  })
}

export function cancelLufs(requestId: string): void {
  const queued = queue.find((j) => j.id === requestId)
  if (queued) {
    queued.cancelled = true
    return
  }
  if (active?.id === requestId) {
    active.cancelled = true
    try {
      active.child?.kill('SIGTERM')
    } catch {
      // ignore
    }
  }
}

/** Test helper — drain queue state between unit tests that exercise the queue. */
export function __resetLufsQueueForTests(): void {
  for (const job of queue) {
    job.cancelled = true
    job.resolve({ ok: false, reason: 'cancelled', cancelled: true })
  }
  queue.length = 0
  if (active) {
    active.cancelled = true
    try {
      active.child?.kill('SIGTERM')
    } catch {
      // ignore
    }
    active = null
  }
}
