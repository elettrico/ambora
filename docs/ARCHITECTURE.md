# Architecture

## Process Model

Ambora runs as an Electron app with three processes:

```
┌─────────────────────────────────────────────────┐
│  Main Process (Node.js)                         │
│  ├── Express server (serves phone remote)       │
│  ├── WebSocket server (real-time communication) │
│  ├── Data persistence (JSON files)              │
│  └── IPC bridge to renderer                     │
├─────────────────────────────────────────────────┤
│  Renderer Process (Chromium)                    │
│  ├── React desktop UI                           │
│  ├── Audio engine (Web Audio API + YouTube)     │
│  ├── Zustand stores (single source of truth)    │
│  └── Receives commands via IPC from main        │
├─────────────────────────────────────────────────┤
│  Preload Script                                 │
│  └── Secure IPC bridge (contextBridge)          │
└─────────────────────────────────────────────────┘

Phone Remote (browser on local WiFi)
  ├── Vanilla HTML/CSS/JS (no React, no bundler)
  ├── Served as static files by Express
  └── Communicates via WebSocket
```

## Data Flow

```
Phone Remote ──WebSocket──→ Main Process ──IPC──→ Renderer (audio + state)
                                                        │
                                                        ▼
                                                  Zustand stores
                                                        │
                                                        ▼
                                              Main Process ──WebSocket──→ Phone Remote
                                              (state sync)
```

## Audio Engine

Dual-channel crossfade system with channels A and B that alternate:

1. Climate activated from silence: load on Channel A, fade in
2. Climate switch: load new on inactive channel, crossfade both simultaneously
3. Track ends: crossfade to next track within the climate
4. Supports both local files (Web Audio API) and YouTube (IFrame API)

## Directory Structure

```
src/main/              → Electron main process
src/preload/           → Preload script for IPC bridge
src/renderer/src/      → Desktop React app
  components/ui/       → shadcn/ui (do not edit)
  components/          → App components
  store/               → Zustand stores
  audio/               → Audio engine
  lib/                 → Types, constants, utilities
remote/                → Phone remote (vanilla JS)
tests/                 → Unit + e2e tests
docs/                  → Architecture docs
```
