import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import type { Campaign } from '../shared/types'
import { createStarterCampaign } from './starterCampaign'

const DATA_DIR = join(app.getPath('userData'), 'ambora-data')
const CAMPAIGNS_FILE = join(DATA_DIR, 'campaigns.json')
const LUFS_CACHE_FILE = join(DATA_DIR, 'lufs-cache.json')
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

export function loadCampaigns(): Campaign[] {
  try {
    ensureDataDir()
    let campaigns: Campaign[] = []
    if (existsSync(CAMPAIGNS_FILE)) {
      const raw = readFileSync(CAMPAIGNS_FILE, 'utf-8')
      const data: unknown = JSON.parse(raw)
      if (Array.isArray(data)) {
        campaigns = data as Campaign[]
      }
    }
    if (needsStarterSeed(campaigns)) {
      campaigns = [createStarterCampaign()]
      writeToDisk(campaigns)
      markStarterSeeded()
    } else if (!existsSync(STARTER_SEEDED_FILE)) {
      markStarterSeeded()
    }
    return campaigns
  } catch {
    return []
  }
}

function writeToDisk(campaigns: Campaign[]): void {
  ensureDataDir()
  writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2), 'utf-8')
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
  ensureDataDir()
  writeFileSync(LUFS_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8')
}
