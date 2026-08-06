import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
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
  copyFileSync: vi.fn(),
  renameSync: vi.fn(),
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
const mockCopyFileSync = vi.mocked(copyFileSync)
const mockRenameSync = vi.mocked(renameSync)

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
    expect(result.campaigns).toEqual([mockStarterCampaign])
    expect(result.error).toBeUndefined()
  })

  it('writes campaigns and marker to disk on first seed', () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path).endsWith('campaigns.json')) return false
      if (String(path).endsWith('.starter-seeded')) return false
      return true
    })
    loadCampaigns()
    // Atomic write: write tmp, then rename; plus marker write.
    expect(mockWriteFileSync).toHaveBeenCalled()
    expect(mockRenameSync).toHaveBeenCalled()
    const tmpWrite = mockWriteFileSync.mock.calls.find((c) =>
      String(c[0]).endsWith('campaigns.json.tmp'),
    )
    expect(tmpWrite).toBeTruthy()
    const written = JSON.parse(tmpWrite![1] as string)
    expect(written).toEqual([mockStarterCampaign])
  })

  it('seeds starter when campaigns.json is empty and no marker exists', () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path).endsWith('.starter-seeded')) return false
      return true // campaigns.json and data dir exist
    })
    mockReadFileSync.mockReturnValue('[]')
    const result = loadCampaigns()
    expect(result.campaigns).toEqual([mockStarterCampaign])
  })

  it('does not re-seed when marker exists', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[]')
    const result = loadCampaigns()
    expect(result.campaigns).toEqual([])
  })

  it('returns parsed campaigns from valid JSON', () => {
    const campaigns = [makeCampaign('Test')]
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue(JSON.stringify(campaigns))
    expect(loadCampaigns().campaigns).toEqual(campaigns)
  })

  it('restores from backup when primary JSON is corrupt', () => {
    const backup = [makeCampaign('Recovered')]
    mockExistsSync.mockImplementation((path) => {
      const p = String(path)
      if (p.endsWith('campaigns.json.bak')) return true
      return true
    })
    mockReadFileSync.mockImplementation((path) => {
      if (String(path).endsWith('campaigns.json.bak')) {
        return JSON.stringify(backup)
      }
      return 'not json{{{'
    })
    const result = loadCampaigns()
    expect(result.campaigns).toEqual(backup)
    expect(result.warning).toMatch(/corrupt/i)
    expect(result.error).toBeUndefined()
  })

  it('returns an error (not silent empty) when primary and backup are corrupt', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('not json{{{')
    const result = loadCampaigns()
    expect(result.campaigns).toEqual([])
    expect(result.error).toMatch(/corrupt|could not read/i)
  })

  it('returns an error when JSON is not an array and backup is missing', () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path).endsWith('campaigns.json.bak')) return false
      return true
    })
    mockReadFileSync.mockReturnValue('{"not": "array"}')
    const result = loadCampaigns()
    expect(result.campaigns).toEqual([])
    expect(result.error).toBeTruthy()
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
    expect(mockWriteFileSync).toHaveBeenCalled()
    expect(mockRenameSync).toHaveBeenCalled()
  })

  it('writes via temp file then rename, keeping a bak of the previous file', () => {
    mockExistsSync.mockReturnValue(true)
    saveCampaigns([makeCampaign('Atomic')])
    vi.advanceTimersByTime(500)

    const tmpWrite = mockWriteFileSync.mock.calls.find((c) =>
      String(c[0]).endsWith('campaigns.json.tmp'),
    )
    expect(tmpWrite).toBeTruthy()
    expect(mockCopyFileSync).toHaveBeenCalled()
    expect(String(mockCopyFileSync.mock.calls[0][1])).toMatch(/campaigns\.json\.bak$/)
    expect(mockRenameSync).toHaveBeenCalled()
    expect(String(mockRenameSync.mock.calls[0][0])).toMatch(/campaigns\.json\.tmp$/)
    expect(String(mockRenameSync.mock.calls[0][1])).toMatch(/campaigns\.json$/)
  })

  it('only writes the latest data when called multiple times', () => {
    saveCampaigns([makeCampaign('First')])
    saveCampaigns([makeCampaign('Second')])
    saveCampaigns([makeCampaign('Third')])

    vi.advanceTimersByTime(500)
    expect(mockRenameSync).toHaveBeenCalledOnce()

    const tmpWrite = mockWriteFileSync.mock.calls.find((c) =>
      String(c[0]).endsWith('campaigns.json.tmp'),
    )
    const written = JSON.parse(tmpWrite![1] as string)
    expect(written[0].name).toBe('Third')
  })
})

describe('flushSave', () => {
  it('writes immediately when there is pending data', () => {
    const campaigns = [makeCampaign('Flush')]
    saveCampaigns(campaigns)

    expect(mockWriteFileSync).not.toHaveBeenCalled()
    flushSave()
    expect(mockWriteFileSync).toHaveBeenCalled()
    expect(mockRenameSync).toHaveBeenCalledOnce()

    const tmpWrite = mockWriteFileSync.mock.calls.find((c) =>
      String(c[0]).endsWith('campaigns.json.tmp'),
    )
    const written = JSON.parse(tmpWrite![1] as string)
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
    mockRenameSync.mockClear()

    vi.advanceTimersByTime(1000)
    expect(mockWriteFileSync).not.toHaveBeenCalled()
    expect(mockRenameSync).not.toHaveBeenCalled()
  })
})
