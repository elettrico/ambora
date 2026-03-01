# Ambora — Build Plan

Track progress with checkboxes. Each step must pass `npm run lint`, `npm run typecheck`, and `npm run build` before moving on.

---

## Step 1: Project Scaffolding + Open Source Setup

- [ ] Scaffold with `npm create @quick-start/electron@latest` (React + TS template)
- [ ] Install core dependencies: Tailwind CSS v4 (`@tailwindcss/vite`), Zustand, Express, `ws`, `qrcode`, `@fontsource-variable/inter`, Lucide React
- [ ] Install dev dependencies: ESLint 9 + plugins, Prettier, Husky, lint-staged, Vitest, Playwright
- [ ] Configure `electron.vite.config.ts` (Tailwind v4 plugin, `@` alias)
- [ ] Initialize shadcn/ui (`npx shadcn@latest init`, new-york style)
- [ ] Install shadcn components: button, card, dialog, input, label, slider, dropdown-menu, tabs, badge, tooltip, scroll-area, separator, sonner, sheet, alert-dialog
- [ ] Set up Tailwind v4 theme in `src/renderer/src/index.css` (full color system, typography, spacing tokens from design spec)
- [ ] Configure ESLint 9 flat config (`eslint.config.js`)
- [ ] Configure Prettier (`.prettierrc`)
- [ ] Configure `.editorconfig`
- [ ] Set up Husky + lint-staged (pre-commit: lint + format)
- [ ] Create `.gitignore`
- [ ] Create open source files: LICENSE (MIT), README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, CHANGELOG.md
- [ ] Create `.github/` directory: CI workflow, release workflow, issue templates (bug + feature), PR template, dependabot.yml, CODEOWNERS
- [ ] Create `docs/ARCHITECTURE.md`
- [ ] Create `src/renderer/src/lib/types.ts` (Campaign, Climate, Track, AppState interfaces)
- [ ] Create `src/renderer/src/lib/constants.ts` (16 climate colors, 20 climate icons, defaults)
- [ ] Create `src/renderer/src/lib/utils.ts` (shadcn `cn()` utility)
- [ ] Verify: `npm run dev` starts, `npm run lint` passes with 0 warnings, `npm run typecheck` passes, `npm run build` succeeds

## Step 2: Data Layer

- [ ] Implement JSON persistence in `src/main/data.ts` (read/write to `userData/ambora-data/campaigns.json`, debounced 500ms save)
- [ ] Implement campaign CRUD in data layer (create, read, update, delete)
- [ ] Implement climate CRUD (add/edit/delete within a campaign, reorder)
- [ ] Implement track CRUD (add/remove within a climate, reorder)
- [ ] Create Zustand campaign store (`src/renderer/src/store/campaignStore.ts`) — campaigns list, active campaign, CRUD actions
- [ ] Create Zustand audio store (`src/renderer/src/store/audioStore.ts`) — playback state (AppState: isPlaying, volume, activeClimateId, activeTrackId, isFadingToSilence)
- [ ] Set up IPC bridge in `src/preload/index.ts` for data operations (renderer ↔ main)
- [ ] Wire IPC handlers in `src/main/index.ts` for campaign/climate/track CRUD
- [ ] Write unit tests for data persistence and store logic

## Step 3: Desktop UI Shell

- [ ] Build `Sidebar.tsx` — logo ("Ambora" display text), campaign list, "New Campaign" button, QR code panel placeholder, connection status
- [ ] Build `CampaignView.tsx` — campaign name (inline editable), description, climate grid, "Add Climate" card
- [ ] Build `ClimateGrid.tsx` — CSS Grid (auto-fit, minmax 200px), climate cards with left color accent bar, icon, name, track count badge
- [ ] Build `ClimateDetail.tsx` — climate editing panel (name, color picker, icon picker, crossfade slider 1-10s), track list, add track button
- [ ] Build `ColorPicker.tsx` — 16 preset climate colors grid
- [ ] Build `IconPicker.tsx` — 20 preset Lucide icons grid
- [ ] Build `TrackList.tsx` — drag handle, source icon (YouTube/Music), title, duration, delete button (visible on hover)
- [ ] Build `AddTrackModal.tsx` — shadcn Dialog with Tabs ("YouTube" / "Local File"), YouTube URL input with oEmbed fetch, local file picker with drag-and-drop zone
- [ ] Build `NowPlayingBar.tsx` — fixed bottom bar (64px), active climate color dot, track title, skip button, volume slider
- [ ] Build `Settings.tsx` — server port, default crossfade duration, audio output device dropdown, about section
- [ ] Build `App.tsx` — layout shell (sidebar + main content area), route between campaign view and settings
- [ ] Implement campaign create/edit/delete flows with AlertDialog confirmations
- [ ] Implement climate create/edit/delete flows
- [ ] Implement drag-and-drop reordering for climates and tracks
- [ ] Verify all desktop UI renders correctly, lint/typecheck pass

## Step 4: Audio Engine

- [ ] Build `AudioEngine.ts` — main controller, dual-channel (A/B) state machine, master volume
- [ ] Build `LocalPlayer.ts` — HTMLAudioElement → AudioContext → GainNode → destination, `linearRampToValueAtTime()` for fades, `ended` event handling
- [ ] Build `CrossfadeManager.ts` — orchestrates crossfade between channels (climate switch: configurable 1-10s, track advance: ~2s, fade from silence: 1s, fade to silence: 3s)
- [ ] Implement climate activation from silence (load first track on Channel A, fade 0 → master volume over 1s)
- [ ] Implement climate switch crossfade (load new track on inactive channel at vol 0, crossfade both channels over configured duration)
- [ ] Implement track-end advance (crossfade to next track, loop playlist)
- [ ] Implement manual "next track" (same as track-end but user-triggered)
- [ ] Implement "fade to silence" (fade active channel to 0 over 3s, pause on completion)
- [ ] Implement "resume from silence" (fade back in over 1s)
- [ ] Implement master volume control (0-100, immediately adjusts active channel proportionally)
- [ ] Implement audio output device selection (`setSinkId`)
- [ ] Wire audio engine to audioStore (state sync)
- [ ] Write unit tests for crossfade logic

## Step 5: Local Server + WebSocket

- [ ] Build `src/main/server.ts` — Express server on configurable port (default 3000)
- [ ] Serve `remote/` directory as static files
- [ ] Auto-detect local IP via `os.networkInterfaces()` (filter loopback)
- [ ] Set up WebSocket server (via `ws`) on same Express server
- [ ] Implement WebSocket protocol — phone→desktop messages: `switch_climate`, `set_volume`, `fade_to_silence`, `next_track`, `resume_from_silence`, `select_campaign`
- [ ] Implement WebSocket protocol — desktop→phone messages: `state_update`, `campaign_data`, `active_campaign`
- [ ] On phone connect: send `campaign_data`, `active_campaign`, `state_update`
- [ ] On any state change: push `state_update` to all connected phones
- [ ] On data edit: push updated campaign data to phones
- [ ] Set up IPC forwarding: phone command → main process → renderer (audio engine)
- [ ] Handle port-in-use error (try next port, update QR/URL)
- [ ] Track connection status (connected/disconnected) and expose to renderer
- [ ] Handle phone disconnect gracefully (desktop continues playing)

## Step 6: Phone Remote

- [ ] Create `remote/index.html` — viewport meta (no zoom), safe-area-inset, dark background
- [ ] Create `remote/remote.css` — full design system (dark theme, climate card colors at 15% opacity, glow pulse animation, spring tap animation, touch targets 44x44px minimum, responsive 2-column grid)
- [ ] Create `remote/remote.js` — vanilla JS, no dependencies
- [ ] Implement WebSocket connection with auto-reconnect (2s retry)
- [ ] Implement disconnected overlay (WifiOff icon pulsing, "Reconnecting..." text)
- [ ] Implement header with campaign name dropdown
- [ ] Implement campaign selector bottom sheet (slide up 300ms, pill handle, campaign list, tap backdrop to dismiss)
- [ ] Implement climate card grid (2 columns, 12px gap, cards fill available height)
- [ ] Implement climate card states (inactive: 15% color bg + 30% border, active: 20% bg + 80% border + glow pulse + box-shadow)
- [ ] Implement climate card tap (scale 0.95 → 1.0 spring, haptic vibrate 40ms, send `switch_climate`)
- [ ] Implement now playing bar (track title truncated, skip button with 48px touch target)
- [ ] Implement volume slider (6px track, 20px thumb, 44px touch area, throttled 100ms updates)
- [ ] Implement fade-to-silence button (48px circle, icon toggles VolumeX ↔ Play)
- [ ] Implement empty states (no campaign, no climates)
- [ ] Implement `prefers-reduced-motion` (disable glow pulse + spring animations)

## Step 7: YouTube Integration

- [ ] Build `YouTubePlayer.ts` — dynamic IFrame API loading, hidden 1x1px iframes
- [ ] Implement player pool (2 instances for Channel A/B)
- [ ] Implement `player.setVolume(0-100)` for crossfade volume control
- [ ] Implement `onStateChange` handler (state 0 = ended → trigger next track)
- [ ] Implement `onError` handler (skip track + sonner toast "Track unavailable, skipping...")
- [ ] Implement pre-buffering: `player.cueVideoById()` for first track of every non-playing climate
- [ ] Integrate YouTube player into AudioEngine (same crossfade logic as local files)
- [ ] Implement YouTube URL parsing (extract video ID from various URL formats)
- [ ] Implement YouTube oEmbed title fetch (`https://www.youtube.com/oembed?url=...&format=json`)
- [ ] Handle no-internet gracefully (YouTube won't work, local files continue, clear message)

## Step 8: QR Code Connection

- [ ] Build `QRCodePanel.tsx` — QR code display (120x120px, white on transparent) using `qrcode` package (`QRCode.toDataURL()`)
- [ ] QR encodes `http://<local-ip>:<port>/remote`
- [ ] Display URL as selectable text below QR code (caption style)
- [ ] Display connection status: 8px green dot + "Connected" or red dot + "Disconnected"
- [ ] Desktop shows sonner toast on phone connect ("Phone connected")
- [ ] Auto-update QR/URL if port changes

## Step 9: Polish

- [x] Animations: climate card hover (150ms), track add (200ms fade-in), track delete (200ms fade-out), climate switch transition on phone (glow fade 400ms)
- [x] Track title change animation (fade out 200ms, fade in 300ms with 100ms delay)
- [x] Sonner toast notifications: phone connected, YouTube error, track skipped, climate deleted
- [x] Empty states: no campaigns ("Create your first campaign"), no climates ("Add a climate to get started"), no tracks ("Add tracks to this climate")
- [x] Error handling: YouTube fails → skip + toast, local file missing → skip + mark broken, port in use → try next, phone disconnect → desktop continues
- [x] Keyboard accessibility (desktop): all interactive elements focusable, focus rings (2px accent, offset 2px)
- [x] Screen reader support: climate cards announce name + track count
- [x] `prefers-reduced-motion` on desktop (disable spring animations)
- [x] Inline editing for campaign name/description
- [x] Min window size enforcement (900x600)

## Step 10: Packaging

- [x] Configure `electron-builder` in `package.json` (app ID, product name, directories)
- [x] macOS config: .dmg with background image, icon positions
- [x] Windows config: .exe/.msi installer, icon
- [x] Linux config: .AppImage + .deb
- [x] App icons: generate from SVG for all platforms (icns, ico, png)
- [ ] Verify `npm run dist` produces working installers on current platform
- [ ] Test packaged app: launches, plays audio, phone remote connects
- [x] Final lint/typecheck/build pass with 0 warnings/errors

---

## Current Status

**Active Step:** Steps 9-10 complete (pending dist verification)
**Branch:** main
**Last Updated:** 2026-02-27
