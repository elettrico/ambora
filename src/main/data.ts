import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import type { Campaign } from '../shared/types'

const DATA_DIR = join(app.getPath('userData'), 'ambora-data')
const CAMPAIGNS_FILE = join(DATA_DIR, 'campaigns.json')
const SAVE_DEBOUNCE_MS = 500

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingData: Campaign[] | null = null

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function loadCampaigns(): Campaign[] {
  try {
    ensureDataDir()
    if (!existsSync(CAMPAIGNS_FILE)) {
      return []
    }
    const raw = readFileSync(CAMPAIGNS_FILE, 'utf-8')
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) {
      return []
    }
    return data as Campaign[]
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
