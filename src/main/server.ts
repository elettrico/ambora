import { createServer } from 'http'
import { join } from 'path'
import { networkInterfaces } from 'os'
import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { app, BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import type { RemoteFullState, RemoteStateMessage } from '../shared/types'

const PORT = 3000

let httpServer: ReturnType<typeof createServer> | null = null
let wss: WebSocketServer | null = null
let cachedState: RemoteFullState | null = null

const clients = new Set<WebSocket>()

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

export function startServer(mainWindow: BrowserWindow): void {
  const expressApp = express()

  // Serve phone remote static files
  const remotePath = is.dev ? join(__dirname, '../../remote') : join(app.getAppPath(), '../remote')

  expressApp.use(express.static(remotePath))

  httpServer = createServer(expressApp)

  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws) => {
    clients.add(ws)

    // Send cached state to new connection
    if (cachedState) {
      const msg: RemoteStateMessage = { type: 'full-state', payload: cachedState }
      ws.send(JSON.stringify(msg))
    }

    ws.on('message', (raw) => {
      try {
        const command = JSON.parse(raw.toString())
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('remote:command', command)
        }
      } catch {
        // Ignore malformed messages
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
    })
  })

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] Port ${PORT} is already in use`)
    } else {
      console.error('[server] Server error:', err)
    }
  })

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Listening on http://0.0.0.0:${PORT}`)
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
