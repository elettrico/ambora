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

## Ambient Engine

`AmbientEngine` runs beside the music engine, sharing its `AudioContext` (owned by
`audio/audioContext.ts`) but never touching the crossfade channels. It plays a
climate's **ambient layers**: wind looping under everything, birds every 8–20
seconds, a raven when the GM taps it.

```
clip file ──decoded once──▶ AudioBuffer cache
                                 │
              AudioBufferSourceNode (one per trigger)
                                 │
                            layer gain ── layer volume × enabled
                                 │
                            stack gain ── scene fade (one per activation)
                                 │
                           master gain ── master volume
                                 │
                             destination
```

- Clips are decoded once and cached, so a one-shot fires with no latency.
- A "stack" is one climate's live layers. Switching climates fades a new stack in
  while the old one fades out, over the same `crossfadeDuration` as the music.
- Ambient layers are **local files only** — YouTube can't deliver short
  overlapping clips.
- A climate with layers but no tracks plays as an ambience-only scene; the music
  engine tracks this with an `ambient` engine state.
- Runtime layer state (enabled/volume) lives in `audioStore.ambientRuntime` and is
  **ephemeral**: the stored layer holds the scene's authored defaults, and
  re-activating the climate restores them.

See `docs/RFC-ambient-layers.md` for the full design.

## Two Kinds of Operation

Ambora is a performance instrument, and most of what it does happens while a
session is running. But not everything does, and the two kinds of operation are
held to different standards.

**Performance operations** are what the GM does during play: switching
climates, adjusting volume, firing a soundboard pad, toggling an ambient layer.
These must be seamless. Nothing they do may block the UI, and nothing they do
may cut audio that should keep playing.

**Maintenance operations** reorganise a campaign rather than perform it:
importing, collecting media into the campaign folder, and — as they arrive —
moving a campaign to a new directory or packaging it with its media. These are
safe to run at any time, but they are allowed to hold the campaign busy while
they work. A modal that stays open until the operation finishes is acceptable;
background execution, cancellation, and mid-run edits are not requirements, and
adding them means answering where results go, whether a second run can start,
and what happens if the campaign is edited or deleted meanwhile.

The line between the two is not "never during a session". A maintenance
operation is reachable mid-session, so it must not disrupt audio that is already
playing — Collect Media remaps a live ambient layer's paths without re-arming
it, because the collected copy is byte-identical to the file already decoded.
What it need not do is stay interactive, or account for every unlikely
interaction with the session around it.

When a maintenance operation turns out to run long enough in practice that the
modal becomes a problem, that is the evidence to revisit it — not the
hypothetical.

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
