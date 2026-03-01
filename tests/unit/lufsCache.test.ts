import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockLoadLufsCache = vi.fn()
const mockSaveLufsCache = vi.fn()

vi.stubGlobal('window', {
  api: {
    loadLufsCache: mockLoadLufsCache,
    saveLufsCache: mockSaveLufsCache,
  },
})

let LufsCache: typeof import('../../src/renderer/src/audio/LufsCache').LufsCache

beforeEach(async () => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.resetModules()
  const mod = await import('../../src/renderer/src/audio/LufsCache')
  LufsCache = mod.LufsCache
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('LufsCache', () => {
  it('returns undefined for unknown keys', () => {
    const cache = new LufsCache()
    expect(cache.get('/unknown/path.mp3')).toBeUndefined()
    expect(cache.has('/unknown/path.mp3')).toBe(false)
  })

  it('stores and retrieves LUFS values', () => {
    const cache = new LufsCache()
    cache.set('/music/track.mp3', -18.5)
    expect(cache.get('/music/track.mp3')).toBe(-18.5)
    expect(cache.has('/music/track.mp3')).toBe(true)
  })

  it('loads from disk via IPC', async () => {
    mockLoadLufsCache.mockResolvedValue({
      '/music/a.mp3': -14.2,
      '/music/b.mp3': -20.0,
    })
    const cache = new LufsCache()
    await cache.loadFromDisk()
    expect(cache.get('/music/a.mp3')).toBe(-14.2)
    expect(cache.get('/music/b.mp3')).toBe(-20.0)
  })

  it('ignores non-finite values from disk', async () => {
    mockLoadLufsCache.mockResolvedValue({
      '/good.mp3': -14.2,
      '/bad.mp3': 'not-a-number',
      '/also-bad.mp3': null,
    })
    const cache = new LufsCache()
    await cache.loadFromDisk()
    expect(cache.has('/good.mp3')).toBe(true)
    expect(cache.has('/bad.mp3')).toBe(false)
    expect(cache.has('/also-bad.mp3')).toBe(false)
  })

  it('debounces saves by 2 seconds', () => {
    const cache = new LufsCache()
    cache.set('/a.mp3', -14)
    cache.set('/b.mp3', -18)

    expect(mockSaveLufsCache).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1999)
    expect(mockSaveLufsCache).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(mockSaveLufsCache).toHaveBeenCalledOnce()

    const savedData = mockSaveLufsCache.mock.calls[0][0]
    expect(savedData['/a.mp3']).toBe(-14)
    expect(savedData['/b.mp3']).toBe(-18)
  })

  it('flush writes immediately when dirty', () => {
    const cache = new LufsCache()
    cache.set('/a.mp3', -14)

    expect(mockSaveLufsCache).not.toHaveBeenCalled()
    cache.flush()
    expect(mockSaveLufsCache).toHaveBeenCalledOnce()
  })

  it('flush does nothing when not dirty', () => {
    const cache = new LufsCache()
    cache.flush()
    expect(mockSaveLufsCache).not.toHaveBeenCalled()
  })

  it('flush prevents the debounced save from firing', () => {
    const cache = new LufsCache()
    cache.set('/a.mp3', -14)
    cache.flush()
    mockSaveLufsCache.mockClear()

    vi.advanceTimersByTime(5000)
    expect(mockSaveLufsCache).not.toHaveBeenCalled()
  })

  it('dispose flushes and clears', () => {
    const cache = new LufsCache()
    cache.set('/a.mp3', -14)
    cache.dispose()

    expect(mockSaveLufsCache).toHaveBeenCalledOnce()
    expect(cache.has('/a.mp3')).toBe(false)
  })
})
