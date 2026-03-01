import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  desktopCapturer,
  session,
} from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadCampaigns, saveCampaigns, flushSave, loadLufsCache, saveLufsCache } from './data'
import {
  startServer,
  stopServer,
  broadcastToClients,
  updateCachedState,
  getLocalIP,
} from './server'

let mainWindow: BrowserWindow | null = null
const audioPathRegistry = new Map<string, string>()

function createWindow(): BrowserWindow {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function registerIpcHandlers(): void {
  ipcMain.handle('data:get-campaigns', () => {
    return loadCampaigns()
  })

  ipcMain.on('data:save-campaigns', (_event, campaigns) => {
    saveCampaigns(campaigns)
  })

  ipcMain.handle('server:get-info', () => {
    return { port: 3000, localIP: getLocalIP() }
  })

  ipcMain.on('remote:state-update', (_event, message) => {
    broadcastToClients(message)
  })

  ipcMain.on('remote:full-state', (_event, state) => {
    updateCachedState(state)
  })

  ipcMain.handle('audio:register-path', (_event, filePath: string) => {
    const token = randomUUID()
    audioPathRegistry.set(token, filePath)
    return token
  })

  ipcMain.handle('audio:load-lufs-cache', () => {
    return loadLufsCache()
  })

  ipcMain.on('audio:save-lufs-cache', (_event, cache: Record<string, number>) => {
    saveLufsCache(cache)
  })

  ipcMain.handle('youtube:get-title', async (_event, videoUrl: string) => {
    try {
      const response = await net.fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
      )
      if (!response.ok) return null
      const data = (await response.json()) as { title?: string }
      return data.title ?? null
    } catch {
      return null
    }
  })
}

// Register custom protocol for serving local audio files.
// Must be called before app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-audio', privileges: { stream: true, supportFetchAPI: true } },
])

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Serve local audio files via custom protocol so the renderer
  // can load them regardless of its own origin (http:// in dev, file:// in prod).
  protocol.handle('local-audio', (request) => {
    const token = new URL(request.url).pathname.replace(/^\/+/, '')
    const filePath = audioPathRegistry.get(token)
    if (!filePath) {
      return new Response('Not found', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).href)
  })

  // Allow renderer to capture system audio via getDisplayMedia for YouTube AGC
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'] })
      if (sources.length === 0) {
        callback({})
        return
      }
      callback({ video: sources[0], audio: 'loopback' })
    } catch {
      callback({})
    }
  })

  registerIpcHandlers()

  mainWindow = createWindow()
  startServer(mainWindow)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      startServer(mainWindow)
    }
  })
})

// Flush pending data writes and stop server before quitting
app.on('before-quit', () => {
  stopServer()
  flushSave()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
