import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = (...args: unknown[]) => void

const { mockApp, ipcHandlers, ipcListeners, mockUpdater, updaterListeners } = vi.hoisted(() => {
  const updaterListeners = new Map<string, Listener>()
  return {
    mockApp: { isPackaged: true },
    ipcHandlers: new Map<string, Listener>(),
    ipcListeners: new Map<string, Listener>(),
    updaterListeners,
    mockUpdater: {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      checkForUpdates: vi.fn(),
      quitAndInstall: vi.fn(),
      on: vi.fn((event: string, listener: Listener) => {
        updaterListeners.set(event, listener)
      }),
    },
  }
})

vi.mock('electron', () => ({
  app: mockApp,
  ipcMain: {
    handle: (channel: string, handler: Listener) => ipcHandlers.set(channel, handler),
    on: (channel: string, listener: Listener) => ipcListeners.set(channel, listener),
  },
}))
vi.mock('electron-updater', () => ({ autoUpdater: mockUpdater }))

import {
  __resetAutoUpdateForTests,
  initAutoUpdate,
  isAutoUpdateSupported,
} from '../../src/main/autoUpdate'

const realPlatform = process.platform

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform })
}

function fakeWindow(): { send: ReturnType<typeof vi.fn>; window: never } {
  const send = vi.fn()
  const window = { isDestroyed: () => false, webContents: { send } } as never
  return { send, window }
}

describe('auto-update', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    __resetAutoUpdateForTests()
    ipcHandlers.clear()
    ipcListeners.clear()
    updaterListeners.clear()
    mockApp.isPackaged = true
    mockUpdater.checkForUpdates.mockResolvedValue(null)
    setPlatform('darwin')
    delete process.env.APPIMAGE
  })

  afterEach(() => {
    vi.useRealTimers()
    setPlatform(realPlatform)
    delete process.env.APPIMAGE
  })

  it('is supported only where the running app can be replaced in place', () => {
    expect(isAutoUpdateSupported()).toBe(true)
    setPlatform('win32')
    expect(isAutoUpdateSupported()).toBe(true)
    setPlatform('linux')
    expect(isAutoUpdateSupported()).toBe(false)
    process.env.APPIMAGE = '/home/gm/Ambora.AppImage'
    expect(isAutoUpdateSupported()).toBe(true)
    mockApp.isPackaged = false
    expect(isAutoUpdateSupported()).toBe(false)
  })

  it('never checks from a dev build, but still answers the renderer', async () => {
    mockApp.isPackaged = false
    initAutoUpdate(() => null)
    await vi.advanceTimersByTimeAsync(5 * 60 * 60 * 1000)
    expect(mockUpdater.checkForUpdates).not.toHaveBeenCalled()
    expect(ipcHandlers.get('update:get-status')?.()).toEqual({ state: 'idle' })
  })

  it('checks after startup and periodically, downloading and installing on quit', async () => {
    initAutoUpdate(() => null)
    expect(mockUpdater.autoDownload).toBe(true)
    expect(mockUpdater.autoInstallOnAppQuit).toBe(true)
    expect(mockUpdater.checkForUpdates).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(10_000)
    expect(mockUpdater.checkForUpdates).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000)
    expect(mockUpdater.checkForUpdates).toHaveBeenCalledTimes(2)
  })

  it('reports download progress and readiness to the window', () => {
    const { send, window } = fakeWindow()
    initAutoUpdate(() => window)

    updaterListeners.get('update-available')?.({ version: '0.9.1' })
    expect(send).toHaveBeenLastCalledWith('update:status', {
      state: 'downloading',
      version: '0.9.1',
    })

    updaterListeners.get('update-downloaded')?.({ version: '0.9.1' })
    expect(send).toHaveBeenLastCalledWith('update:status', { state: 'ready', version: '0.9.1' })
    expect(ipcHandlers.get('update:get-status')?.()).toEqual({ state: 'ready', version: '0.9.1' })
  })

  it('stops checking once an update is downloaded', async () => {
    initAutoUpdate(() => null)
    updaterListeners.get('update-downloaded')?.({ version: '0.9.1' })
    await vi.advanceTimersByTimeAsync(10_000 + 4 * 60 * 60 * 1000)
    expect(mockUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('treats a failed check as silent and retries on the next interval', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockUpdater.checkForUpdates.mockRejectedValueOnce(new Error('offline'))
    initAutoUpdate(() => null)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(warn).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000)
    expect(mockUpdater.checkForUpdates).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('stops offering an update that fails to download or install', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    initAutoUpdate(() => null)
    const status = (): unknown => ipcHandlers.get('update:get-status')?.()

    updaterListeners.get('update-available')?.({ version: '0.9.1' })
    updaterListeners.get('error')?.(new Error('connection reset'))
    expect(status()).toEqual({ state: 'idle' })

    // macOS: Squirrel validates the signature after update-downloaded fires.
    updaterListeners.get('update-downloaded')?.({ version: '0.9.1' })
    updaterListeners.get('error')?.(
      new Error('code failed to satisfy specified code requirement(s)'),
    )
    expect(status()).toEqual({ state: 'idle' })
    warn.mockRestore()
  })

  it('installs only when an update is ready', () => {
    initAutoUpdate(() => null)
    ipcListeners.get('update:install')?.()
    expect(mockUpdater.quitAndInstall).not.toHaveBeenCalled()

    updaterListeners.get('update-downloaded')?.({ version: '0.9.1' })
    ipcListeners.get('update:install')?.()
    expect(mockUpdater.quitAndInstall).toHaveBeenCalledOnce()
  })
})
