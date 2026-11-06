import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rm, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type {
  Campaign,
  CampaignMediaType,
  CollectCampaignMediaResult,
  CollectMediaProgress,
} from '../shared/types'

interface MediaReference {
  mediaType: CampaignMediaType
  localFilePath: string
}

interface CopyTask extends MediaReference {
  size: number
  typeDirectory: string
}

function mediaReferences(campaign: Campaign): MediaReference[] {
  return [
    ...campaign.climates.flatMap((climate) => [
      ...climate.tracks
        .filter(
          (track): track is typeof track & { localFilePath: string } =>
            track.source === 'local' && Boolean(track.localFilePath),
        )
        .map((track) => ({
          mediaType: 'music' as const,
          localFilePath: track.localFilePath,
        })),
      ...(climate.ambientLayers ?? []).flatMap((layer) =>
        layer.clips
          .filter((clip) => Boolean(clip.localFilePath))
          .map((clip) => ({
            mediaType: 'ambient' as const,
            localFilePath: clip.localFilePath,
          })),
      ),
    ]),
    ...(campaign.soundboard ?? [])
      .filter((sound) => Boolean(sound.localFilePath))
      .map((sound) => ({
        mediaType: 'sfx' as const,
        localFilePath: sound.localFilePath,
      })),
  ]
}

function isInside(parent: string, candidate: string): boolean {
  const pathFromParent = relative(parent, candidate)
  return pathFromParent === '' || (!pathFromParent.startsWith('..') && !isAbsolute(pathFromParent))
}

function numberedName(filePath: string, index: number): string {
  const extension = extname(filePath)
  return `${basename(filePath, extension)}-${index}${extension}`
}

function failureReason(error: unknown): string {
  const code = (error as NodeJS.ErrnoException)?.code
  switch (code) {
    case 'ENOENT':
      return 'File not found'
    case 'EACCES':
    case 'EPERM':
      return 'Permission denied'
    case 'ENOSPC':
      return 'Not enough disk space'
    case 'EISDIR':
      return 'Source is not a file'
    default:
      return error instanceof Error ? error.message : 'Could not copy file'
  }
}

async function availableDestination(directory: string, sourcePath: string): Promise<string> {
  let candidate = join(directory, basename(sourcePath))
  let index = 2

  while (true) {
    try {
      await stat(candidate)
      candidate = join(directory, numberedName(sourcePath, index))
      index += 1
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return candidate
      throw error
    }
  }
}

async function copyWithProgress(
  sourcePath: string,
  destination: string,
  onChunk: (bytes: number) => void,
): Promise<void> {
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      onChunk(chunk.length)
      callback(null, chunk)
    },
  })

  try {
    await pipeline(
      createReadStream(sourcePath),
      meter,
      createWriteStream(destination, { flags: 'wx' }),
    )
  } catch (error) {
    await rm(destination, { force: true }).catch(() => undefined)
    throw error
  }
}

/**
 * Copies every unique local media source into a user-selected directory.
 * Originals remain untouched and callers receive only successful path rewrites.
 */
export async function collectCampaignMedia(
  campaign: Campaign,
  destinationDirectory: string,
  onProgress?: (progress: CollectMediaProgress) => void,
): Promise<CollectCampaignMediaResult> {
  const mediaDirectory = resolve(destinationDirectory)
  const result: Omit<CollectCampaignMediaResult, 'finalProgress'> = {
    destinationDirectory: mediaDirectory,
    copiedFiles: 0,
    skippedFiles: 0,
    copiedBytes: 0,
    failures: [],
    pathUpdates: [],
  }

  const referencesByPath = new Map<string, MediaReference>()
  for (const reference of mediaReferences(campaign)) {
    if (!referencesByPath.has(reference.localFilePath)) {
      referencesByPath.set(reference.localFilePath, reference)
    }
  }

  const uniqueReferences = [...referencesByPath.values()]
  const createdDirectories = new Set<string>()
  let completedFiles = 0
  let completedBytes = 0
  let copiedBytes = 0

  const initialProgress: CollectMediaProgress = {
    completedFiles,
    totalFiles: uniqueReferences.length,
    copiedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    completedBytes,
    copiedBytes,
    totalBytes: 0,
    failures: [],
  }
  onProgress?.(initialProgress)

  const copyTasks: CopyTask[] = []
  for (const reference of uniqueReferences) {
    try {
      const sourceStats = await stat(reference.localFilePath)
      if (!sourceStats.isFile()) {
        result.failures.push({
          sourcePath: reference.localFilePath,
          reason: 'Source is not a file',
        })
        completedFiles += 1
        continue
      }

      if (isInside(mediaDirectory, resolve(reference.localFilePath))) {
        result.skippedFiles += 1
        completedFiles += 1
        continue
      }

      copyTasks.push({
        ...reference,
        size: sourceStats.size,
        typeDirectory: join(mediaDirectory, reference.mediaType),
      })
    } catch (error) {
      result.failures.push({
        sourcePath: reference.localFilePath,
        reason: failureReason(error),
      })
      completedFiles += 1
    }
  }

  const totalBytes = copyTasks.reduce((total, task) => total + task.size, 0)
  let lastReportedBytes = 0
  const reportProgress = (): void => {
    onProgress?.({
      completedFiles,
      totalFiles: uniqueReferences.length,
      copiedFiles: result.copiedFiles,
      skippedFiles: result.skippedFiles,
      failedFiles: result.failures.length,
      completedBytes,
      copiedBytes,
      totalBytes,
      failures: [...result.failures],
    })
    lastReportedBytes = completedBytes
  }
  reportProgress()

  for (const task of copyTasks) {
    let taskBytes = 0
    let destination = ''
    try {
      if (!createdDirectories.has(task.typeDirectory)) {
        await mkdir(task.typeDirectory, { recursive: true })
        createdDirectories.add(task.typeDirectory)
      }
      destination = await availableDestination(task.typeDirectory, task.localFilePath)
      await copyWithProgress(task.localFilePath, destination, (bytes) => {
        taskBytes += bytes
        completedBytes += bytes
        copiedBytes += bytes
        if (completedBytes - lastReportedBytes >= 1024 * 1024) reportProgress()
      })
      result.copiedFiles += 1
      result.copiedBytes += task.size
      result.pathUpdates.push({
        sourcePath: task.localFilePath,
        collectedPath: destination,
      })
    } catch (error) {
      result.failures.push({ sourcePath: task.localFilePath, reason: failureReason(error) })
      completedBytes += task.size - taskBytes
      copiedBytes -= taskBytes
    } finally {
      completedFiles += 1
      reportProgress()
    }
  }

  return {
    ...result,
    finalProgress: {
      completedFiles,
      totalFiles: uniqueReferences.length,
      copiedFiles: result.copiedFiles,
      skippedFiles: result.skippedFiles,
      failedFiles: result.failures.length,
      completedBytes,
      copiedBytes,
      totalBytes,
      failures: [...result.failures],
    },
  }
}
