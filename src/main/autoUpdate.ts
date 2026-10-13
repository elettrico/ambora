import { app, ipcMain, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../shared/types'

// Long enough that the check never competes with startup work.
const FIRST_CHECK_DELAY_MS = 10_000
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

let status: UpdateStatus = { state: 'idle' }
let getWindow: () => BrowserWindow | null = () => null

/**
 * electron-updater can replace the running app only where an update can be
 * swapped in place: the macOS .app (signed, from the zip), the Windows NSIS
 * install, and a Linux AppImage. A .deb is upgraded by the package manager,
 * and an unpackaged dev build has nothing to replace.
 */
export function isAutoUpdateSupported(): boolean {
  if (!app.isPackaged) return false
  if (process.platform === 'darwin' || process.platform === 'win32') return true
  return process.platform === 'linux' && Boolean(process.env.APPIMAGE)
}

function setStatus(next: UpdateStatus): void {
  status = next
  const window = getWindow()
  if (window && !window.isDestroyed()) {
    window.webContents.send('update:status', status)
  }
}

function check(): void {
  // Once an update is downloaded there is nothing more to do until restart.
  if (status.state !== 'idle') return
  autoUpdater.checkForUpdates().catch((error: unknown) => {
    // Offline at the table is normal. Say nothing; the next check retries.
    console.warn('[auto-update] check failed:', error instanceof Error ? error.message : error)
  })
}

/**
 * Download updates in the background and install them when the app quits.
 * Never restarts on its own: Ambora may be mid-session, and only the GM
 * decides when the music stops.
 */
export function initAutoUpdate(windowGetter: () => BrowserWindow | null): void {
  getWindow = windowGetter

  ipcMain.handle('update:get-status', () => status)
  ipcMain.on('update:install', () => {
    if (status.state === 'ready') autoUpdater.quitAndInstall()
  })

  if (!isAutoUpdateSupported()) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    setStatus({ state: 'downloading', version: info.version })
  })
  autoUpdater.on('update-downloaded', (info) => {
    setStatus({ state: 'ready', version: info.version })
  })
  autoUpdater.on('error', (error) => {
    console.warn('[auto-update]', error.message)
    // Checks stop once an update is found, so any error from here on is about
    // that update: a failed download, or on macOS a signature that Squirrel
    // rejects after electron-updater has already reported it downloaded.
    // Either way it can't be installed, so stop offering it; the next check
    // starts over.
    if (status.state !== 'idle') setStatus({ state: 'idle' })
  })

  setTimeout(check, FIRST_CHECK_DELAY_MS)
  setInterval(check, CHECK_INTERVAL_MS)
}

export function __resetAutoUpdateForTests(): void {
  status = { state: 'idle' }
  getWindow = () => null
}
