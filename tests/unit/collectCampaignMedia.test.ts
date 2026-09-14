import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Campaign, CollectMediaPathUpdate, CollectMediaProgress } from '../../src/shared/types'

const paths = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => paths.userData },
}))

import { collectCampaignMedia } from '../../src/main/collectCampaignMedia'

let testDir: string

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'ambora-collect-media-'))
  paths.userData = join(testDir, 'user-data')
})

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true })
})

function campaignWithPaths(pathsByType: { track: string; clip: string; sound: string }): Campaign {
  return {
    id: 'campaign-1',
    name: 'Test Campaign',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    climates: [
      {
        id: 'climate-1',
        name: 'Forest',
        color: '#000000',
        icon: 'Trees',
        order: 0,
        crossfadeDuration: 4,
        tracks: [
          {
            id: 'track-1',
            title: 'Music',
            source: 'local',
            localFilePath: pathsByType.track,
            order: 0,
          },
          {
            id: 'track-2',
            title: 'YouTube',
            source: 'youtube',
            youtubeVideoId: 'abc',
            order: 1,
          },
        ],
        ambientLayers: [
          {
            id: 'layer-1',
            name: 'Wind',
            mode: 'loop',
            enabled: true,
            volume: 50,
            clips: [
              {
                id: 'clip-1',
                title: 'Wind',
                localFilePath: pathsByType.clip,
                order: 0,
              },
            ],
            clipOrder: 'sequential',
            minDelaySec: 0,
            maxDelaySec: 0,
            order: 0,
          },
        ],
      },
    ],
    soundboard: [
      {
        id: 'sound-1',
        name: 'Effect',
        localFilePath: pathsByType.sound,
        volume: 100,
        playbackMode: 'restart',
        order: 0,
      },
    ],
  }
}

function applyUpdates(campaign: Campaign, updates: CollectMediaPathUpdate[]): Campaign {
  const clone = structuredClone(campaign)
  for (const climate of clone.climates) {
    for (const track of climate.tracks) {
      if (track.localFilePath) {
        const update = updates.find((item) => item.sourcePath === track.localFilePath)
        if (update) {
          track.localFilePath = update.collectedPath
        }
      }
    }
    for (const layer of climate.ambientLayers ?? []) {
      for (const clip of layer.clips) {
        const update = updates.find((item) => item.sourcePath === clip.localFilePath)
        if (update) {
          clip.localFilePath = update.collectedPath
        }
      }
    }
  }
  for (const sound of clone.soundboard ?? []) {
    const update = updates.find((item) => item.sourcePath === sound.localFilePath)
    if (update) {
      sound.localFilePath = update.collectedPath
    }
  }
  return clone
}

describe('collectCampaignMedia', () => {
  it('copies each unique local source and leaves originals untouched', async () => {
    const libraryDir = join(testDir, 'library')
    await mkdir(libraryDir, { recursive: true })
    const sharedPath = join(libraryDir, 'shared.mp3')
    const clipPath = join(libraryDir, 'wind.wav')
    await writeFile(sharedPath, 'music')
    await writeFile(clipPath, 'wind')

    const campaign = campaignWithPaths({
      track: sharedPath,
      clip: clipPath,
      sound: sharedPath,
    })
    const onProgress = vi.fn()
    const result = await collectCampaignMedia(campaign, onProgress)

    expect(result.copiedFiles).toBe(2)
    expect(result.copiedBytes).toBe(9)
    expect(result.skippedFiles).toBe(0)
    expect(result.failures).toEqual([])
    expect(result.pathUpdates).toHaveLength(2)
    expect(result.finalProgress).toEqual({
      completedFiles: 2,
      totalFiles: 2,
      copiedFiles: 2,
      skippedFiles: 0,
      failedFiles: 0,
      completedBytes: 9,
      copiedBytes: 9,
      totalBytes: 9,
      failures: [],
    })
    expect(onProgress.mock.calls[0]).toEqual([
      {
        completedFiles: 0,
        totalFiles: 2,
        copiedFiles: 0,
        skippedFiles: 0,
        failedFiles: 0,
        completedBytes: 0,
        copiedBytes: 0,
        totalBytes: 0,
        failures: [],
      },
    ])
    expect(onProgress.mock.calls.some(([progress]) => progress.copiedBytes > 0)).toBe(true)
    expect(onProgress.mock.calls.at(-1)).toEqual([
      {
        completedFiles: 2,
        totalFiles: 2,
        copiedFiles: 2,
        skippedFiles: 0,
        failedFiles: 0,
        completedBytes: 9,
        copiedBytes: 9,
        totalBytes: 9,
        failures: [],
      },
    ])
    expect(await readFile(sharedPath, 'utf8')).toBe('music')
    expect(await readFile(clipPath, 'utf8')).toBe('wind')

    for (const update of result.pathUpdates) {
      const expectedTypeDir = update.sourcePath === sharedPath ? 'music' : 'ambient'
      expect(update.collectedPath).toContain(
        join('ambora-data', 'campaigns', campaign.id, 'media', expectedTypeDir),
      )
      expect(await readFile(update.collectedPath, 'utf8')).toBe(
        update.sourcePath === sharedPath ? 'music' : 'wind',
      )
    }
  })

  it('skips files already collected when the action is repeated', async () => {
    const sourcePath = join(testDir, 'rain.wav')
    await writeFile(sourcePath, 'rain')
    const campaign = campaignWithPaths({ track: sourcePath, clip: sourcePath, sound: sourcePath })
    const first = await collectCampaignMedia(campaign)
    const second = await collectCampaignMedia(applyUpdates(campaign, first.pathUpdates))

    expect(second.copiedFiles).toBe(0)
    expect(second.skippedFiles).toBe(1)
    expect(second.failures).toEqual([])
    expect(second.pathUpdates).toEqual([])
    expect(second.finalProgress).toMatchObject({
      completedFiles: 1,
      totalFiles: 1,
      copiedFiles: 0,
      skippedFiles: 1,
      failedFiles: 0,
      completedBytes: 0,
      totalBytes: 0,
      failures: [],
    })
  })

  it('treats type directories as filing hints and does not reclassify managed media', async () => {
    const managedAmbientDir = join(
      paths.userData,
      'ambora-data',
      'campaigns',
      'campaign-1',
      'media',
      'ambient',
    )
    await mkdir(managedAmbientDir, { recursive: true })
    const managedPath = join(managedAmbientDir, 'thunder.wav')
    await writeFile(managedPath, 'thunder')
    const campaign = campaignWithPaths({ track: '', clip: '', sound: managedPath })

    const result = await collectCampaignMedia(campaign)

    expect(result.copiedFiles).toBe(0)
    expect(result.skippedFiles).toBe(1)
    expect(result.pathUpdates).toEqual([])
    expect(await readFile(managedPath, 'utf8')).toBe('thunder')
  })

  it('reports deleted managed media as missing without falling back to original files', async () => {
    const sourcePath = join(testDir, 'rain.wav')
    await writeFile(sourcePath, 'rain')
    const campaign = campaignWithPaths({ track: sourcePath, clip: sourcePath, sound: sourcePath })
    const first = await collectCampaignMedia(campaign)
    const collectedCampaign = applyUpdates(campaign, first.pathUpdates)
    await Promise.all(first.pathUpdates.map((update) => rm(update.collectedPath)))

    const second = await collectCampaignMedia(collectedCampaign)

    expect(second.copiedFiles).toBe(0)
    expect(second.skippedFiles).toBe(0)
    expect(second.pathUpdates).toEqual([])
    expect(second.failures).toEqual(
      first.pathUpdates.map((update) => ({
        sourcePath: update.collectedPath,
        reason: 'File not found',
      })),
    )
    expect(second.finalProgress).toMatchObject({
      completedFiles: 1,
      totalFiles: 1,
      copiedFiles: 0,
      skippedFiles: 0,
      failedFiles: 1,
    })
  })

  it('reports byte progress while a large file is still being copied', async () => {
    const sourcePath = join(testDir, 'large.mp3')
    await writeFile(sourcePath, Buffer.alloc(3 * 1024 * 1024))
    const campaign = campaignWithPaths({ track: sourcePath, clip: sourcePath, sound: sourcePath })
    campaign.climates[0].ambientLayers = []
    campaign.soundboard = []
    const onProgress = vi.fn()

    await collectCampaignMedia(campaign, onProgress)

    const updates = onProgress.mock.calls.map(([progress]) => progress as CollectMediaProgress)
    expect(
      updates.some(
        (progress) =>
          progress.completedFiles === 0 &&
          progress.completedBytes > 0 &&
          progress.completedBytes < progress.totalBytes,
      ),
    ).toBe(true)
    expect(updates.at(-1)?.copiedBytes).toBe(3 * 1024 * 1024)
  })

  it('keeps both files when different sources have the same name', async () => {
    const firstDir = join(testDir, 'first')
    const secondDir = join(testDir, 'second')
    await mkdir(firstDir)
    await mkdir(secondDir)
    const firstPath = join(firstDir, 'rain.wav')
    const secondPath = join(secondDir, 'rain.wav')
    await writeFile(firstPath, 'first')
    await writeFile(secondPath, 'second')

    const campaign = campaignWithPaths({ track: firstPath, clip: firstPath, sound: firstPath })
    campaign.climates[0].tracks.push({
      id: 'track-3',
      title: 'Second rain',
      source: 'local',
      localFilePath: secondPath,
      order: 2,
    })
    const result = await collectCampaignMedia(campaign)

    expect(result.copiedFiles).toBe(2)
    expect(result.pathUpdates.map((item) => item.collectedPath)).toEqual([
      expect.stringMatching(/rain\.wav$/),
      expect.stringMatching(/rain-2\.wav$/),
    ])
  })

  it('reports unavailable sources and still collects the remaining files', async () => {
    const availablePath = join(testDir, 'available.wav')
    const missingPath = join(testDir, 'missing.wav')
    await writeFile(availablePath, 'audio')

    const onProgress = vi.fn()
    const result = await collectCampaignMedia(
      campaignWithPaths({ track: availablePath, clip: missingPath, sound: availablePath }),
      onProgress,
    )

    expect(result.copiedFiles).toBe(1)
    expect(result.failures).toEqual([{ sourcePath: missingPath, reason: 'File not found' }])
    expect(result.pathUpdates).toHaveLength(1)
    expect(result.finalProgress.failures).toEqual(result.failures)
    expect(
      onProgress.mock.calls.some(([progress]) =>
        progress.failures.some(
          (failure: { sourcePath: string }) => failure.sourcePath === missingPath,
        ),
      ),
    ).toBe(true)
  })

  it('ignores imported media placeholders with empty local paths', async () => {
    const campaign = campaignWithPaths({ track: '', clip: '', sound: '' })
    const result = await collectCampaignMedia(campaign)

    expect(result).toMatchObject({
      copiedFiles: 0,
      skippedFiles: 0,
      copiedBytes: 0,
      failures: [],
      pathUpdates: [],
      finalProgress: {
        completedFiles: 0,
        totalFiles: 0,
        failedFiles: 0,
      },
    })
  })

  it('rejects campaign ids that escape the managed campaigns directory', async () => {
    const campaign = campaignWithPaths({ track: '/a', clip: '/b', sound: '/c' })
    campaign.id = '../outside'

    await expect(collectCampaignMedia(campaign)).rejects.toThrow('Invalid campaign id')
  })
})
