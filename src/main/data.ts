import { app } from 'electron'
import { join } from 'path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import type { Campaign, LoadCampaignsResult } from '../shared/types'
import { createStarterCampaign } from './starterCampaign'

export type { LoadCampaignsResult }

const DATA_DIR = join(app.getPath('userData'), 'ambora-data')
const CAMPAIGNS_FILE = join(DATA_DIR, 'campaigns.json')
const CAMPAIGNS_TMP = join(DATA_DIR, 'campaigns.json.tmp')
const CAMPAIGNS_BAK = join(DATA_DIR, 'campaigns.json.bak')
const LUFS_CACHE_FILE = join(DATA_DIR, 'lufs-cache.json')
const LUFS_CACHE_TMP = join(DATA_DIR, 'lufs-cache.json.tmp')
const STARTER_SEEDED_FILE = join(DATA_DIR, '.starter-seeded')
const SAVE_DEBOUNCE_MS = 500

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingData: Campaign[] | null = null

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function needsStarterSeed(campaigns: Campaign[]): boolean {
  return campaigns.length === 0 && !existsSync(STARTER_SEEDED_FILE)
}

function markStarterSeeded(): void {
  writeFileSync(STARTER_SEEDED_FILE, '', 'utf-8')
}

function parseCampaignsJson(raw: string): Campaign[] | null {
  const data: unknown = JSON.parse(raw)
  if (!Array.isArray(data)) {
    return null
  }
  return data as Campaign[]
}

function readCampaignsFile(path: string): Campaign[] | null {
  const raw = readFileSync(path, 'utf-8')
  return parseCampaignsJson(raw)
}

/**
 * Atomically replace `target` with the contents of a temp file.
 * Keeps a `.bak` of the previous good file when one exists.
 */
function atomicWriteJson(target: string, tmp: string, bak: string | null, value: unknown): void {
  ensureDataDir()
  const json = JSON.stringify(value, null, 2)
  writeFileSync(tmp, json, 'utf-8')
  if (bak && existsSync(target)) {
    copyFileSync(target, bak)
  }
  renameSync(tmp, target)
}

function writeToDisk(campaigns: Campaign[]): void {
  atomicWriteJson(CAMPAIGNS_FILE, CAMPAIGNS_TMP, CAMPAIGNS_BAK, campaigns)
}

export function loadCampaigns(): LoadCampaignsResult {
  try {
    ensureDataDir()

    if (existsSync(CAMPAIGNS_FILE)) {
      try {
        const campaigns = readCampaignsFile(CAMPAIGNS_FILE)
        if (campaigns === null) {
          throw new Error('campaigns.json root is not an array')
        }
        if (needsStarterSeed(campaigns)) {
          const seeded = [createStarterCampaign()]
          writeToDisk(seeded)
          markStarterSeeded()
          return { campaigns: seeded }
        }
        if (!existsSync(STARTER_SEEDED_FILE)) {
          markStarterSeeded()
        }
        return { campaigns }
      } catch (primaryError) {
        // Primary exists but is unreadable/corrupt — try last-known-good backup.
        // Never silently present this as an empty library (and never seed over it).
        console.error('[data] Failed to load campaigns.json:', primaryError)
        if (existsSync(CAMPAIGNS_BAK)) {
          try {
            const backup = readCampaignsFile(CAMPAIGNS_BAK)
            if (backup !== null) {
              if (!existsSync(STARTER_SEEDED_FILE)) {
                markStarterSeeded()
              }
              return {
                campaigns: backup,
                warning:
                  'Campaign data looked corrupt; restored the last good backup. Recent edits may be missing.',
              }
            }
          } catch (backupError) {
            console.error('[data] Failed to load campaigns.json.bak:', backupError)
          }
        }
        if (!existsSync(STARTER_SEEDED_FILE)) {
          markStarterSeeded()
        }
        return {
          campaigns: [],
          error:
            'Could not read saved campaigns. Your data file may be corrupt — check Help or restore from a backup.',
        }
      }
    }

    // No campaigns file yet.
    let campaigns: Campaign[] = []
    if (needsStarterSeed(campaigns)) {
      campaigns = [createStarterCampaign()]
      writeToDisk(campaigns)
      markStarterSeeded()
    } else if (!existsSync(STARTER_SEEDED_FILE)) {
      markStarterSeeded()
    }
    return { campaigns }
  } catch (error) {
    console.error('[data] Unexpected load failure:', error)
    return {
      campaigns: [],
      error: 'Could not load campaigns from disk.',
    }
  }
}

export function saveCampaigns(campaigns: Campaign[]): void {
  pendingData = campaigns
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    if (pendingData) {
      writeToDisk(pendingData)
      pendingData = null
    }
    saveTimer = null
  }, SAVE_DEBOUNCE_MS)
}

export function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (pendingData) {
    writeToDisk(pendingData)
    pendingData = null
  }
}

export function loadLufsCache(): Record<string, number> {
  try {
    ensureDataDir()
    if (!existsSync(LUFS_CACHE_FILE)) {
      return {}
    }
    const raw = readFileSync(LUFS_CACHE_FILE, 'utf-8')
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return {}
    }
    return data as Record<string, number>
  } catch {
    return {}
  }
}

export function saveLufsCache(cache: Record<string, number>): void {
  atomicWriteJson(LUFS_CACHE_FILE, LUFS_CACHE_TMP, null, cache)
}
