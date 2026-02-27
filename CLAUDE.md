# CLAUDE.md

## What is Ambora

Ambora is an open-source Electron desktop app for managing atmospheric music during tabletop RPG sessions, with a phone-based remote control over local WiFi. The DM sets up campaigns/climates/tracks on the desktop, then controls playback from their phone during sessions with one-tap climate switching and smooth audio crossfading.

Two interfaces: desktop app (Electron + React) for setup and audio playback, and a phone remote (vanilla JS web page served over local network via Express + WebSocket).

## Tech Stack

- Electron 40.x + electron-vite 5.x + React 19 + TypeScript (strict)
- shadcn/ui (new-york style) + Tailwind CSS v4 (`@tailwindcss/vite`, config via `@theme` in CSS, NOT `tailwind.config.js`)
- Zustand for state, Express + `ws` for local server, Web Audio API + YouTube IFrame API for playback
- ESLint 9 (flat config), Prettier, Husky + lint-staged
- electron-builder for packaging (macOS, Windows, Linux)
- MIT licensed

## Key Commands

```bash
npm run dev          # Start Electron with hot reload
npm run build        # Production build
npm run lint         # ESLint (must pass with 0 warnings)
npm run typecheck    # TypeScript strict check
npm run format       # Prettier write
npm run format:check # Prettier check (CI)
npm run test         # Vitest
npm run dist         # Build installers for current platform
```

## Project Structure

```
src/main/          → Electron main process (Node.js: server, data persistence, IPC)
src/preload/       → Preload script for secure IPC bridge
src/renderer/src/  → Desktop React app (components, stores, audio engine)
  components/ui/   → shadcn/ui generated components (DO NOT edit manually)
  components/      → App components (PascalCase filenames)
  store/           → Zustand stores (single source of truth)
  audio/           → Audio engine (dual-channel crossfade, YouTube + local files)
  lib/             → Shared types, constants, utilities
remote/            → Phone remote UI (vanilla JS, NOT React — served as static files by Express)
tests/             → Vitest unit tests + Playwright e2e scaffold
docs/              → Architecture docs
```

## Critical Architecture Rules

1. **The phone remote (`remote/`) is NOT part of the Electron renderer build.** It's plain HTML/CSS/JS served as static files by Express. Keep it lightweight — no React, no bundler, no npm dependencies. It must load fast on a phone over local WiFi.

2. **Audio runs in the renderer process**, not the main process. The renderer has access to Web Audio API and YouTube IFrame API. The main process handles the Express/WebSocket server and data persistence.

3. **Dual-channel crossfade**: Two audio channels (A and B) alternate. When switching climates, the new track loads on the inactive channel at volume 0, then both channels crossfade simultaneously. See `src/renderer/src/audio/` for implementation.

4. **Zustand stores are the single source of truth.** Desktop UI reads from stores. WebSocket pushes state updates to the phone remote. Phone sends commands back via WebSocket to the main process, which forwards to the renderer via IPC.

5. **Data persists as JSON** in `app.getPath('userData')/ambora-data/campaigns.json`. Save on every change, debounced 500ms. No database.

## Code Conventions

- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- **Branches**: `feature/description`, `fix/description`, `docs/description`
- Components: PascalCase files (`ClimateGrid.tsx`). Utilities: camelCase (`campaignStore.ts`)
- Functional components with hooks only, no class components
- All new components need TypeScript strict types — no `any`
- shadcn components: install via `npx shadcn@latest add <name>`, never edit `components/ui/` directly
- Tailwind v4: use `@import "tailwindcss"` and `@theme inline` for config. No `tailwind.config.js`
- Inter Variable font loaded via `@fontsource-variable/inter` (offline, no CDN)

## Design System Summary

- **Dark-only UI.** Background: `#0C0C0E`. Text: `#EAEAED` (primary), `#9494A0` (secondary). Never pure black or pure white.
- **Accent**: desaturated blue `#7B93F5`. Danger: `#F07070`. Success: `#5EC269`.
- **Climate card colors are the ONLY saturated elements** in the UI. Applied at 15-20% opacity on cards. 16 preset colors defined in `lib/constants.ts`.
- **Elevation via background steps, not shadows.** Three surface levels (`--surface-1/2/3`). Shadows only on overlays (modals, dialogs).
- **4px spacing grid.** All spacing multiples of 4.
- **Phone remote touch targets: minimum 44×44px.** Use padding to extend hit areas.
- **Respect `prefers-reduced-motion`** — disable glow pulse and spring animations.
- Full design spec: @docs/DESIGN.md (the UI/UX specification document)

## When Compacting

Always preserve: the list of modified files, any failing test output, the current build step from the build order, and the active branch name.

## Build Order Reference

See the bottom of the build prompt for the 10-step build order. In short: (1) scaffold + open source files + tooling, (2) data layer, (3) desktop UI shell, (4) audio engine, (5) local server + WebSocket, (6) phone remote, (7) YouTube integration, (8) QR code connection, (9) polish, (10) packaging.

## Detailed Specs

For full implementation details, read these files:
- @docs/BUILD_PROMPT.md — Complete build prompt with all feature specs, data models, WebSocket protocol, component specs
- @docs/DESIGN.md — Full UI/UX design system (colors, typography, spacing, component measurements, animation specs)
- @docs/ARCHITECTURE.md — Technical architecture overview
