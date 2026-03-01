import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import type { Campaign } from '../../src/shared/types'

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/ambora-test',
  },
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

const mockStarterCampaign: Campaign = {
  id: 'starter-id',
  name: 'Starter Campaign',
  climates: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

vi.mock('../../src/main/starterCampaign', () => ({
  createStarterCampaign: () => mockStarterCampaign,
}))

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)
const mockWriteFileSync = vi.mocked(writeFileSync)

// Must import after mocks
let loadCampaigns: typeof import('../../src/main/data').loadCampaigns
let saveCampaigns: typeof import('../../src/main/data').saveCampaigns
let flushSave: typeof import('../../src/main/data').flushSave

beforeEach(async () => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.resetModules()
  const mod = await import('../../src/main/data')
  loadCampaigns = mod.loadCampaigns
  saveCampaigns = mod.saveCampaigns
  flushSave = mod.flushSave
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const makeCampaign = (name: string): Campaign => ({
  id: crypto.randomUUID(),
  name,
  climates: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

describe('loadCampaigns', () => {
  it('seeds starter campaign when no file and no marker exist', () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path).endsWith('campaigns.json')) return false
      if (String(path).endsWith('.starter-seeded')) return false
      return true // data dir exists
    })
    const result = loadCampaigns()
    expect(result).toEqual([mockStarterCampaign])
  })

  it('writes campaigns and marker to disk on first seed', () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path).endsWith('campaigns.json')) return false
      if (String(path).endsWith('.starter-seeded')) return false
      return true
    })
    loadCampaigns()
    // First write: campaigns.json, second write: .starter-seeded marker
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2)
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string)
    expect(written).toEqual([mockStarterCampaign])
  })

  it('seeds starter when campaigns.json is empty and no marker exists', () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path).endsWith('.starter-seeded')) return false
      return true // campaigns.json and data dir exist
    })
    mockReadFileSync.mockReturnValue('[]')
    const result = loadCampaigns()
    expect(result).toEqual([mockStarterCampaign])
  })

  it('does not re-seed when marker exists', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[]')
    const result = loadCampaigns()
    expect(result).toEqual([])
  })

  it('returns parsed campaigns from valid JSON', () => {
    const campaigns = [makeCampaign('Test')]
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify(campaigns))
    expect(loadCampaigns()).toEqual(campaigns)
  })

  it('returns empty array on corrupt JSON', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('not json{{{')
    expect(loadCampaigns()).toEqual([])
  })

  it('returns empty array when JSON is not an array', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('{"not": "array"}')
    expect(loadCampaigns()).toEqual([])
  })
})

describe('saveCampaigns', () => {
  it('debounces writes by 500ms', () => {
    const campaigns = [makeCampaign('Test')]
    saveCampaigns(campaigns)

    expect(mockWriteFileSync).not.toHaveBeenCalled()

    vi.advanceTimersByTime(499)
    expect(mockWriteFileSync).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(mockWriteFileSync).toHaveBeenCalledOnce()
  })

  it('only writes the latest data when called multiple times', () => {
    saveCampaigns([makeCampaign('First')])
    saveCampaigns([makeCampaign('Second')])
    saveCampaigns([makeCampaign('Third')])

    vi.advanceTimersByTime(500)
    expect(mockWriteFileSync).toHaveBeenCalledOnce()

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string)
    expect(written[0].name).toBe('Third')
  })
})

describe('flushSave', () => {
  it('writes immediately when there is pending data', () => {
    const campaigns = [makeCampaign('Flush')]
    saveCampaigns(campaigns)

    expect(mockWriteFileSync).not.toHaveBeenCalled()
    flushSave()
    expect(mockWriteFileSync).toHaveBeenCalledOnce()

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string)
    expect(written[0].name).toBe('Flush')
  })

  it('does nothing when there is no pending data', () => {
    flushSave()
    expect(mockWriteFileSync).not.toHaveBeenCalled()
  })

  it('prevents the debounced write from firing after flush', () => {
    saveCampaigns([makeCampaign('Test')])
    flushSave()
    mockWriteFileSync.mockClear()

    vi.advanceTimersByTime(1000)
    expect(mockWriteFileSync).not.toHaveBeenCalled()
  })
})
