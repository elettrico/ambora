import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Campaign, CollectMediaProgress } from '../../src/shared/types'
import { collectCampaignMedia } from '../../src/main/collectCampaignMedia'

let testDirectory: string
let destinationDirectory: string

beforeEach(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), 'ambora-collect-media-'))
  destinationDirectory = join(testDirectory, 'collected')
})

afterEach(async () => {
  await rm(testDirectory, { recursive: true, force: true })
})

function campaignWithPaths(paths: { track: string; clip: string; sound: string }): Campaign {
  return {
    id: 'campaign-1',
    name: 'Test Campaign',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    climates: [
      {
        id: 'climate-1',
        name: 'Forest',
        color: '#7B93F5',
        icon: 'Trees',
        order: 0,
        crossfadeDuration: 4,
        tracks: [
          {
            id: 'track-1',
            title: 'Music',
            source: 'local',
            localFilePath: paths.track,
            order: 0,
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
                localFilePath: paths.clip,
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
        localFilePath: paths.sound,
        volume: 100,
        playbackMode: 'restart',
        order: 0,
      },
    ],
  }
}

describe('collectCampaignMedia', () => {
  it('copies unique sources, reports progress, and leaves originals untouched', async () => {
    const libraryDirectory = join(testDirectory, 'library')
    await mkdir(libraryDirectory)
    const sharedPath = join(libraryDirectory, 'shared.mp3')
    const ambientPath = join(libraryDirectory, 'wind.wav')
    await writeFile(sharedPath, 'music')
    await writeFile(ambientPath, 'wind')
    const onProgress = vi.fn()

    const result = await collectCampaignMedia(
      campaignWithPaths({ track: sharedPath, clip: ambientPath, sound: sharedPath }),
      destinationDirectory,
      onProgress,
    )

    expect(result).toMatchObject({
      destinationDirectory,
      copiedFiles: 2,
      skippedFiles: 0,
      copiedBytes: 9,
      failures: [],
    })
    expect(result.pathUpdates).toHaveLength(2)
    expect(result.pathUpdates[0].collectedPath).toBe(
      join(destinationDirectory, 'music', 'shared.mp3'),
    )
    expect(result.pathUpdates[1].collectedPath).toBe(
      join(destinationDirectory, 'ambient', 'wind.wav'),
    )
    expect(await readFile(sharedPath, 'utf8')).toBe('music')
    expect(await readFile(ambientPath, 'utf8')).toBe('wind')
    expect(onProgress.mock.calls.at(-1)?.[0]).toEqual(result.finalProgress)
  })

  it('keeps both files when different sources have the same name', async () => {
    const firstDirectory = join(testDirectory, 'first')
    const secondDirectory = join(testDirectory, 'second')
    await mkdir(firstDirectory)
    await mkdir(secondDirectory)
    const firstPath = join(firstDirectory, 'rain.wav')
    const secondPath = join(secondDirectory, 'rain.wav')
    await writeFile(firstPath, 'first')
    await writeFile(secondPath, 'second')
    const campaign = campaignWithPaths({ track: firstPath, clip: secondPath, sound: firstPath })
    campaign.climates[0].tracks.push({
      id: 'track-2',
      title: 'Second rain',
      source: 'local',
      localFilePath: secondPath,
      order: 1,
    })

    const result = await collectCampaignMedia(campaign, destinationDirectory)

    expect(result.pathUpdates.map((update) => update.collectedPath)).toEqual([
      expect.stringMatching(/rain\.wav$/),
      expect.stringMatching(/rain-2\.wav$/),
    ])
  })

  it('skips files already inside the selected folder', async () => {
    const managedDirectory = join(destinationDirectory, 'ambient')
    await mkdir(managedDirectory, { recursive: true })
    const managedPath = join(managedDirectory, 'rain.wav')
    await writeFile(managedPath, 'rain')

    const result = await collectCampaignMedia(
      campaignWithPaths({ track: managedPath, clip: managedPath, sound: managedPath }),
      destinationDirectory,
    )

    expect(result).toMatchObject({ copiedFiles: 0, skippedFiles: 1, failures: [] })
    expect(result.pathUpdates).toEqual([])
  })

  it('reports unavailable sources while still copying available files', async () => {
    const availablePath = join(testDirectory, 'available.wav')
    const missingPath = join(testDirectory, 'missing.wav')
    await writeFile(availablePath, 'audio')
    const progress: CollectMediaProgress[] = []

    const result = await collectCampaignMedia(
      campaignWithPaths({ track: availablePath, clip: missingPath, sound: availablePath }),
      destinationDirectory,
      (update) => progress.push(update),
    )

    expect(result.copiedFiles).toBe(1)
    expect(result.failures).toEqual([{ sourcePath: missingPath, reason: 'File not found' }])
    expect(result.pathUpdates).toHaveLength(1)
    expect(progress.at(-1)?.failedFiles).toBe(1)
  })
})
