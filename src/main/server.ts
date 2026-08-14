import { createServer } from 'http'
import { join } from 'path'
import { networkInterfaces } from 'os'
import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { app, BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import type { RemoteFullState, RemoteStateMessage } from '../shared/types'
import { parseRemoteCommand } from '../shared/remoteCommand'

const PORT = 3000
/** Drop oversized remote messages (commands are tiny JSON). */
const WS_MAX_PAYLOAD = 64 * 1024

let httpServer: ReturnType<typeof createServer> | null = null
let wss: WebSocketServer | null = null
let cachedState: RemoteFullState | null = null
let mainWindow: BrowserWindow | null = null

const clients = new Set<WebSocket>()

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

export function getLocalIP(): string {
  const interfaces = networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name]
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address
      }
    }
  }
  return '127.0.0.1'
}

export function broadcastToClients(message: RemoteStateMessage): void {
  const data = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

export function updateCachedState(state: RemoteFullState): void {
  cachedState = state
}

export function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const expressApp = express()

    // In production, serve the renderer build at /desktop/ so the
    // BrowserWindow can load from http://localhost:3000/desktop/ and
    // get a proper HTTP origin that YouTube accepts for embedding.
    if (!is.dev) {
      const rendererPath = join(__dirname, '../renderer')
      expressApp.use('/desktop', express.static(rendererPath))
    }

    // Serve phone remote static files
    const remotePath = is.dev
      ? join(__dirname, '../../remote')
      : join(app.getAppPath(), '../remote')

    // The remote is updated together with the desktop app. Avoid leaving a
    // phone on an older HTML/JS shell that cannot render newly-added state.
    expressApp.use(
      express.static(remotePath, {
        setHeaders(response) {
          response.setHeader('Cache-Control', 'no-store')
        },
      }),
    )

    httpServer = createServer(expressApp)

    wss = new WebSocketServer({ server: httpServer, maxPayload: WS_MAX_PAYLOAD })

    function notifyConnectionCount(): void {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('server:connection-status', {
          connectedClients: clients.size,
        })
      }
    }

    wss.on('connection', (ws) => {
      clients.add(ws)
      notifyConnectionCount()

      // Send cached state to new connection
      if (cachedState) {
        const msg: RemoteStateMessage = { type: 'full-state', payload: cachedState }
        ws.send(JSON.stringify(msg))
      }

      ws.on('message', (raw) => {
        try {
          const parsed: unknown = JSON.parse(raw.toString())
          const command = parseRemoteCommand(parsed)
          if (!command) return
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('remote:command', command)
          }
        } catch {
          // Ignore malformed messages
        }
      })

      ws.on('close', () => {
        clients.delete(ws)
        notifyConnectionCount()
      })
    })

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[server] Port ${PORT} is already in use`)
      } else {
        console.error('[server] Server error:', err)
      }
      reject(err)
    })

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[server] Listening on http://0.0.0.0:${PORT}`)
      resolve()
    })
  })
}

export function stopServer(): void {
  for (const client of clients) {
    client.close()
  }
  clients.clear()

  wss?.close()
  wss = null

  httpServer?.close()
  httpServer = null
}
