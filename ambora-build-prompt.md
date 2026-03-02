# Ambora — Complete Build Prompt

## Overview

Build **Ambora**, an open-source, cross-platform desktop application (macOS + Windows + Linux) with a phone-based remote control for managing atmospheric music during tabletop RPG sessions.

The app has two interfaces:

1. **Desktop app** (Electron) — the setup tool and audio engine. Used before/between sessions to manage campaigns, climates, and tracks. During a session it runs in the background playing audio.
2. **Phone remote** — a responsive web page served by the desktop app over the local network. Used during sessions to control playback with one-tap climate switching. This is the primary interface during gameplay.

**Repository:** Open source under the MIT license. The project must ship with all standard open source scaffolding (README, CONTRIBUTING, LICENSE, CI/CD, issue templates, etc.) from day one.

---

## Tech Stack

**IMPORTANT: Use the latest stable versions of all packages at the time of development. The versions listed below are current as of February 2026 — always check for newer stable releases before starting.**

- **Desktop framework**: Electron 40.x (latest stable — NOT Tauri, because we need reliable Chromium-based YouTube IFrame embedding)
- **Build tooling**: electron-vite 5.x (the `@electron-vite` package, NOT `vite-plugin-electron` — they are different projects). Use `npm create @quick-start/electron@latest` to scaffold with the React + TypeScript template.
- **Frontend framework**: React 19 + TypeScript (strict mode)
- **UI component library**: shadcn/ui (latest, with Tailwind v4 + React 19 support). Install via `npx shadcn@latest init`. Use the "new-york" style (now the default). shadcn/ui provides accessible, customizable components built on Radix UI primitives — you own the code.
- **Styling**: Tailwind CSS v4 (installed via `@tailwindcss/vite` plugin — note: v4 uses `@import "tailwindcss"` in CSS, NOT the old `@tailwind` directives, and configuration is done in CSS via `@theme`, NOT in `tailwind.config.js`)
- **Key shadcn/ui components to install**: `button`, `card`, `dialog`, `input`, `label`, `slider`, `dropdown-menu`, `tabs`, `badge`, `tooltip`, `scroll-area`, `separator`, `sonner` (toasts), `sheet` (side panels), `alert-dialog` (confirmations)
- **Audio playback**:
  - Local files (MP3, WAV, OGG, FLAC): Web Audio API via HTMLAudioElement with gain nodes for volume control
  - YouTube: YouTube IFrame Player API (embedded hidden players with volume control)
- **Local server**: Express.js running inside Electron on a configurable local port (default: 3000)
- **Real-time communication**: WebSocket (via `ws` library) between desktop and phone remote
- **State management**: Zustand (preferred for its simplicity and minimal boilerplate)
- **Packaging**: electron-builder for creating macOS (.dmg), Windows (.exe/.msi), and Linux (.AppImage/.deb) installers
- **Data persistence**: JSON files stored in the user's app data directory (electron `app.getPath('userData')`)
- **QR code generation**: `qrcode` npm package
- **Icons**: Lucide React (already included with shadcn/ui)
- **Font**: Inter Variable (bundle via `@fontsource-variable/inter` — NEVER rely on Google Fonts CDN, the desktop app must work fully offline)
- **Code quality**: ESLint 9 (flat config), Prettier, TypeScript strict mode
- **Git hooks**: Husky + lint-staged (lint and format on pre-commit)
- **Testing**: Vitest (unit tests), Playwright (e2e — optional for v1 but scaffold the config)

---

## Data Model

```typescript
interface Campaign {
  id: string // uuid
  name: string
  description?: string
  climates: Climate[]
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

interface Climate {
  id: string // uuid
  name: string
  color: string // hex color from the predefined palette
  icon: string // Lucide icon name from the predefined set
  tracks: Track[]
  order: number // display order in the grid
  crossfadeDuration: number // seconds, default 4, range 1-10
}

interface Track {
  id: string // uuid
  title: string
  source: 'youtube' | 'local'
  youtubeVideoId?: string
  youtubeUrl?: string
  localFilePath?: string
  duration?: number // seconds, if known
  order: number // playback order within the climate
}

interface AppState {
  activeCampaignId: string | null
  activeClimateId: string | null
  activeTrackId: string | null
  isPlaying: boolean
  volume: number // 0-100
  isFadingToSilence: boolean
}
```

---

## Feature Specification

### 1. Campaign Management (Desktop only)

- List all campaigns in the sidebar
- Create new campaign: name + optional description
- Edit campaign name/description (inline editing)
- Delete campaign (with shadcn AlertDialog confirmation)
- Select a campaign to view/edit its climates
- Campaigns persist as JSON in the app data directory

### 2. Climate Management (Desktop only)

- Each campaign can have up to 10 climates
- Create a new climate: name, pick a color (from palette below), pick an icon (from set below)
- Edit climate: change name, color, icon
- Delete climate (with confirmation)
- Reorder climates via drag-and-drop (determines grid order on phone remote)
- Each climate has a configurable crossfade duration (default: 4 seconds, range: 1-10 seconds)

**Predefined icon set** (Lucide React):
`Swords`, `Shield`, `Skull`, `TreePine`, `Mountain`, `Castle`, `Flame`, `Waves`, `Moon`, `Sun`, `Beer`, `BookOpen`, `Eye`, `Ghost`, `Crown`, `CloudLightning`, `Heart`, `Tent`, `DoorOpen`, `Sparkles`

### 3. Track Management (Desktop only)

- Within a selected climate, manage its track list
- **Add YouTube track**: paste a YouTube URL. Extract the video ID, use the YouTube oEmbed API (`https://www.youtube.com/oembed?url=VIDEO_URL&format=json`) to fetch the title automatically.
- **Add local file**: file picker dialog (accept .mp3, .wav, .ogg, .flac). Read file metadata for title if available, otherwise use filename.
- Remove track from climate
- Reorder tracks via drag-and-drop
- Tracks play sequentially within a climate, looping back to the first when the list ends. No shuffle for v1.

### 4. Audio Engine (Desktop, runs in background)

**Architecture: Dual-channel crossfade system**

Maintain two audio "channels" (A and B) that can play simultaneously. At most one is "active" (fading in or audible) and one is "outgoing" (fading out). They alternate roles.

**Playback flow:**

1. Climate activated (from silence): Load first track on Channel A, fade from 0 → master volume over 1s.
2. Climate switch (crossfade): Load new climate's first track on the inactive channel at volume 0. Over the crossfade duration: ramp old channel to 0, ramp new channel to master volume. When complete, stop old channel, release resources.
3. Track ends within climate: Crossfade to next track (~2s shorter crossfade). If last track, loop to first.
4. "Next track": Same as track-end but triggered manually.
5. "Fade to silence": Fade active channel from current volume to 0 over 3s. Pause on completion. Set `isFadingToSilence` state.

**Volume control:**

- Master volume (0-100) controls maximum volume
- All fades are relative to master volume
- Changing master volume during playback immediately adjusts the active channel proportionally

**YouTube playback:**

- YouTube IFrame Player API with hidden iframes (1px × 1px)
- `player.setVolume(0-100)` for crossfade volume control
- Handle `onStateChange` (state === 0 = ended → next track), `onError` (→ skip + toast)
- **Pre-buffering**: when session active, cue first track of every non-playing climate via `player.cueVideoById()` for instant switches

**Local file playback:**

- HTMLAudioElement → `audioContext.createMediaElementSource()` → GainNode → destination
- Use `gainNode.gain.linearRampToValueAtTime()` for smooth fades
- Handle `ended` event for next track

### 5. Local Server & Phone Connection

- Express.js on the local network, default port 3000
- Serves phone remote as static files
- WebSocket server for real-time bidirectional communication

**Connection flow:**

1. Desktop starts server on launch, auto-detects local IP via `os.networkInterfaces()`
2. Desktop shows QR code (via `qrcode` package `QRCode.toDataURL()`) encoding `http://<local-ip>:<port>/remote`, plus the URL as selectable text
3. User scans QR or types URL on phone
4. Phone loads remote page, establishes WebSocket
5. Desktop shows "Phone connected ✓" with green status dot

**WebSocket protocol (JSON with `type` field):**

Phone → Desktop:

```json
{ "type": "switch_climate", "climateId": "uuid" }
{ "type": "set_volume", "volume": 75 }
{ "type": "fade_to_silence" }
{ "type": "next_track" }
{ "type": "resume_from_silence" }
{ "type": "select_campaign", "campaignId": "uuid" }
```

Desktop → Phone:

```json
{ "type": "state_update", "state": { ...AppState } }
{ "type": "campaign_data", "campaigns": [...] }
{ "type": "active_campaign", "campaign": { ...Campaign } }
```

On connect: desktop sends `campaign_data`, `active_campaign`, and `state_update`. On any state change: push `state_update`. On data edit: push updated data.

### 6. Settings (Desktop)

Minimal for v1:

- **Server port**: number input, default 3000 (requires restart)
- **Default crossfade duration**: number input, default 4 seconds
- **Audio output device**: dropdown from `navigator.mediaDevices.enumerateDevices()`
- **About**: app version, link to GitHub repository

---

## Design System

### Design Philosophy

Ambora is a **performance instrument for dungeon masters**. During a game session, the DM is talking, improvising, rolling dice, and managing NPCs — all while trying to set the mood with music. The UI must disappear into this workflow.

**Core principles:**

- **Zero cognitive load during play.** The phone remote must be usable with a glance and a tap — no reading, no thinking, no navigating.
- **Dark by default.** Used in dimly lit rooms. Must never blast the DM's face with light or draw attention from players.
- **Quiet confidence.** Feels like a premium audio tool — Ableton's restraint, Spotify's clarity. No fantasy clichés, no parchment textures, no dragon illustrations.
- **Color as information.** Climate cards are the only saturated elements in the entire UI. Everything else is muted. Color = mood = music.

### Color System — App Chrome

Built on a neutral scale with a subtle cool undertone (hue ~260 in OKLCH). **Never use pure black (#000000)** — it creates harsh contrast. **Never use pure white (#FFFFFF) for text** — use off-white to reduce glare. All text/background pairs must meet **WCAG AA contrast ratio ≥ 4.5:1**.

| Token              | Hex         | OKLCH                    | Usage                                        |
| ------------------ | ----------- | ------------------------ | -------------------------------------------- |
| `--background`     | `#0C0C0E`   | `oklch(0.075 0.005 260)` | App background, phone remote background      |
| `--surface-1`      | `#141417`   | `oklch(0.105 0.005 260)` | Sidebar, panels, elevated containers         |
| `--surface-2`      | `#1C1C20`   | `oklch(0.135 0.005 260)` | Cards, inputs, wells                         |
| `--surface-3`      | `#242428`   | `oklch(0.165 0.005 260)` | Hover states, active surfaces                |
| `--border`         | `#2A2A30`   | `oklch(0.195 0.007 260)` | Borders, dividers, separators                |
| `--border-subtle`  | `#1F1F24`   | `oklch(0.150 0.005 260)` | Very subtle dividers                         |
| `--text-primary`   | `#EAEAED`   | `oklch(0.930 0.005 260)` | Headings, primary content                    |
| `--text-secondary` | `#9494A0`   | `oklch(0.640 0.015 270)` | Labels, metadata, helper text                |
| `--text-tertiary`  | `#5C5C68`   | `oklch(0.430 0.015 265)` | Disabled text, placeholders                  |
| `--accent`         | `#7B93F5`   | `oklch(0.670 0.130 265)` | Interactive elements, links, focus rings     |
| `--accent-hover`   | `#95A8F8`   | `oklch(0.730 0.110 265)` | Accent hover state                           |
| `--accent-muted`   | `#7B93F520` | —                        | Accent at 12% opacity for subtle backgrounds |
| `--danger`         | `#F07070`   | `oklch(0.680 0.140 20)`  | Delete actions, errors                       |
| `--success`        | `#5EC269`   | `oklch(0.700 0.150 145)` | Connection status, confirmations             |

### Climate Card Color Palette (16 presets)

These are the only saturated colors in the app. Applied at **controlled opacity** on cards to avoid overwhelming the dark UI.

| Name    | Hex       | Suggested mood                 |
| ------- | --------- | ------------------------------ |
| Crimson | `#DC3545` | Combat, danger, boss           |
| Ember   | `#E8652B` | Fire, urgency, chase           |
| Amber   | `#D4943A` | Tavern, warmth, hearth         |
| Gold    | `#CFAD3B` | Royalty, treasure, celebration |
| Emerald | `#2D9A5D` | Forest, nature, druids         |
| Teal    | `#21917F` | Ocean, river, water            |
| Sky     | `#3B8DD4` | Open sky, travel, day          |
| Cobalt  | `#4B6BD4` | Ice, serenity, calm            |
| Indigo  | `#6659D9` | Arcane, magic, portals         |
| Violet  | `#8B49B8` | Mystery, undead, fey           |
| Rose    | `#C74B7A` | Enchantment, romance           |
| Slate   | `#5E6B73` | Dungeon, stone, stealth        |
| Iron    | `#404850` | Shadow, void, death            |
| Copper  | `#9B6842` | Earth, caves, desert           |
| Silver  | `#A8B0B8` | Divine, ethereal, dreams       |
| Blood   | `#9B2335` | Horror, blood, sacrifice       |

**How climate colors are applied:**

Phone remote cards:

```
Background: climate color at 15% opacity
Border: 1px solid, climate color at 30% opacity
Active border: 2px solid, climate color at 80% opacity
Active glow: box-shadow: 0 0 20px {color}30, 0 0 40px {color}15
Icon color: climate color at 90% opacity
```

Desktop cards:

```
Background: --surface-2
Left accent bar: 3px solid, climate color at 70%
```

### Typography

**Font:** Inter Variable via `@fontsource-variable/inter`. Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`.

Enable OpenType features: `font-feature-settings: 'cv01' 1, 'cv02' 1` (cleaner alternate glyphs).

**Desktop type scale (1.25 Major Third ratio, 14px base):**

| Token        | Size | Weight | Line-height | Letter-spacing | Usage                              |
| ------------ | ---- | ------ | ----------- | -------------- | ---------------------------------- |
| `display`    | 28px | 600    | 1.2         | -0.02em        | "Ambora" logo text                 |
| `heading-1`  | 22px | 600    | 1.25        | -0.015em       | Campaign name                      |
| `heading-2`  | 17px | 600    | 1.3         | -0.01em        | Section titles                     |
| `heading-3`  | 14px | 600    | 1.4         | 0              | Card titles, climate names         |
| `body`       | 14px | 400    | 1.5         | 0              | Default text, descriptions, inputs |
| `body-small` | 13px | 400    | 1.45        | 0.005em        | Track titles, metadata             |
| `caption`    | 11px | 500    | 1.4         | 0.03em         | Timestamps, badges, status         |
| `overline`   | 11px | 600    | 1.3         | 0.06em         | Section labels (uppercase)         |

**Phone remote type scale (larger for arm's-length use):**

| Token             | Size | Weight | Usage                     |
| ----------------- | ---- | ------ | ------------------------- |
| `remote-campaign` | 15px | 500    | Campaign name in header   |
| `remote-climate`  | 15px | 600    | Climate card labels       |
| `remote-track`    | 13px | 400    | Now playing track title   |
| `remote-label`    | 11px | 500    | Volume label, status text |

**Rules:** Never below 11px. Use negative letter-spacing (-0.01em to -0.02em) for headings ≥17px. Use positive letter-spacing (0.03em+) for uppercase overlines.

### Spacing & Layout

**4px base grid.** All spacing values are multiples of 4.

| Token      | Value | Usage                                 |
| ---------- | ----- | ------------------------------------- |
| `space-1`  | 4px   | Minimum gap, tight icon-to-text       |
| `space-2`  | 8px   | Compact padding, related items        |
| `space-3`  | 12px  | Small component inner padding         |
| `space-4`  | 16px  | Standard card padding, list item gaps |
| `space-5`  | 20px  | Section margins, panel padding        |
| `space-6`  | 24px  | Major section gaps                    |
| `space-8`  | 32px  | Large section separators              |
| `space-10` | 40px  | Page top/bottom padding               |

**Border radius:**

| Token         | Value  | Usage                         |
| ------------- | ------ | ----------------------------- |
| `radius-sm`   | 6px    | Inputs, badges, small buttons |
| `radius-md`   | 10px   | Cards, dialogs, panels        |
| `radius-lg`   | 14px   | Phone remote climate cards    |
| `radius-xl`   | 20px   | Phone remote bottom sheet     |
| `radius-full` | 9999px | Pills, circular buttons       |

**Desktop dimensions:**

```
Sidebar width:        260px (fixed)
Sidebar padding:      20px
Main content padding: 32px
Climate grid:         CSS Grid, auto-fit, minmax(200px, 1fr), gap 16px
Track list item:      48px height, 12px 16px padding
Now playing bar:      64px, fixed bottom
Dialog width:         480px (standard), 360px (compact)
Max content width:    960px centered
Min window size:      900px × 600px
```

**Phone remote dimensions:**

```
Screen padding:       16px horizontal, 12px top, 16px bottom
Header:               48px
Climate grid:         2 columns, 12px gap
Climate card height:  80-120px (flexible to fill space)
Now playing bar:      52px
Control bar:          72px
Respect:              env(safe-area-inset-bottom) for notched phones
Viewport meta:        width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no
```

### Shadows & Elevation

On dark backgrounds, traditional shadows are nearly invisible. Use **background color steps and borders** instead.

| Level | Technique                                                          | Usage                       |
| ----- | ------------------------------------------------------------------ | --------------------------- |
| 0     | `--background`                                                     | Page background             |
| 1     | `--surface-1` + `--border-subtle`                                  | Sidebar, panels             |
| 2     | `--surface-2` + `--border`                                         | Cards, inputs               |
| 3     | `--surface-3`                                                      | Hover states                |
| 4     | `--surface-1` + `--border` + `shadow: 0 16px 48px rgba(0,0,0,0.5)` | Modals, dialogs             |
| 5     | Climate color glow                                                 | Active climate card (phone) |

**Rule: No visible shadows on non-overlay elements.** Depth is communicated through background color, not shadows.

### Animation & Motion

**Timing:**

- Micro-interactions (hover, focus): 100-150ms
- State transitions (card activation): 200-300ms
- Glow pulse, now-playing change: 300-500ms
- Easing: `cubic-bezier(0.25, 0.1, 0.25, 1)` (ease-out) default. `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring) for phone card taps.

**Climate card tap (phone):**

```css
.climate-card {
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.climate-card:active {
  transform: scale(0.95);
  transition-duration: 100ms;
}
```

Plus `navigator.vibrate(40)` haptic feedback.

**Active climate glow (phone):**

```css
@keyframes glow-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
.climate-card.active {
  animation: glow-pulse 3s ease-in-out infinite;
}
```

**Climate switch transition:** Old card glow fades out (400ms ease-out), new card glow fades in (400ms ease-out).

**Track title change:** Fade out 200ms, fade in 300ms with 100ms delay.

**Do NOT animate:** Volume slider movement (must be instant), text content swaps, QR code, connection status dot.

**Respect `prefers-reduced-motion`:** Disable glow pulse and spring animations; use instant transitions.

### Iconography

Lucide React exclusively. Sizing:

| Context                | Size | Stroke width |
| ---------------------- | ---- | ------------ |
| Climate icon (phone)   | 28px | 1.5px        |
| Climate icon (desktop) | 24px | 1.5px        |
| Toolbar/action icons   | 18px | 2px          |
| Inline icons           | 16px | 2px          |
| Small indicators       | 14px | 2px          |

Icon colors: Climate icons use the climate's own color at 90%. Action icons: `--text-secondary`, hover → `--text-primary`. Destructive icons: `--text-tertiary`, hover → `--danger`.

### Touch Targets (Phone Remote)

Every tappable element must have a minimum **44×44px** touch area (padding extends hit area beyond visual element).

| Element           | Visual size            | Touch target            | Spacing          |
| ----------------- | ---------------------- | ----------------------- | ---------------- |
| Climate card      | Full column × 80-120px | Same (large enough)     | 12px gap         |
| Skip track        | 18px icon              | 48×48px (via padding)   | Isolated         |
| Volume slider     | 6px track              | 44px tall (via padding) | 16px from edges  |
| Fade to silence   | 48px circle            | 48px                    | 16px from slider |
| Campaign selector | Full header width      | 48px tall               | —                |

---

## Component Specifications

### Climate Card — Phone Remote (most important component)

The DM taps this 20-50 times per session. Must be instantly recognizable and satisfying.

```
Dimensions:       Fill column, height 80-120px (flexible)
Background:       Climate color at 15% opacity
Border:           1px solid, climate color at 30%
Border radius:    14px
Padding:          16px
Icon:             Lucide, 28px, climate color at 90%
Label:            Below icon, 15px semibold, --text-primary
Layout:           Icon centered, label below, 8px gap

ACTIVE STATE:
Border:           2px solid, climate color at 80%
Background:       Climate color at 20%
Box-shadow:       0 0 24px {color}25, 0 0 48px {color}10
Animation:        glow-pulse 3s ease-in-out infinite

TAP:
touch start:      scale(0.95), 100ms ease-out
touch end:        scale(1.0), 200ms spring easing
Haptic:           navigator.vibrate(40)
```

### Volume Slider — Phone Remote

```
Track:            6px height, --surface-3 background
Fill:             --accent at 80%
Thumb:            20px diameter, --accent, 2px --background ring
Touch area:       44px tall (padding around visual)
Behavior:         Sends volume updates throttled to 100ms, visual is immediate
```

### Fade to Silence Button — Phone Remote

```
Shape:            48px circle
Background:       --surface-2
Border:           1px solid --border
Icon:             Lucide VolumeX, 20px, --text-secondary

ACTIVE (fading/silent):
Background:       --accent-muted
Border:           1px solid --accent at 40%
Icon:             Lucide Play, 20px, --accent
```

### Now Playing Bar — Phone Remote

```
Height:           52px
Background:       --surface-1
Border-top:       1px solid --border-subtle
Layout:           Flex row, space-between
Left:             Track title, 13px, --text-secondary, truncate (max 70%)
Right:            Skip button, Lucide SkipForward, 18px, 48px touch target
```

### Climate Card — Desktop

```
Dimensions:       min 200px wide, 120px tall
Background:       --surface-2
Border-left:      3px solid, climate color at 70%
Border-radius:    10px
Padding:          16px
Layout:           Icon (24px, climate color) + name (14px semibold) top-left
                  Track count badge (caption) bottom-right
Hover:            Background → --surface-3, 150ms
Click:            Opens climate detail
```

### Sidebar — Desktop

```
Width:            260px
Background:       --surface-1
Border-right:     1px solid --border-subtle

LOGO:             "Ambora", display style (28px semibold), 32px margin-bottom
CAMPAIGNS:        overline label, items 14px with 8px 12px padding, radius 6px
  Active:         --accent-muted background, --text-primary
  Hover:          --surface-3
  + New:          Ghost button, --accent

QR PANEL (bottom):
  Background:     --surface-2, radius 10px, padding 16px
  QR code:        120×120px, white on transparent
  URL text:       caption style, --text-tertiary, selectable
  Status:         8px dot (--success or --danger) + caption text
```

### Track List Item — Desktop

```
Height:           48px, padding 0 16px
Layout:           [drag handle] [source icon] [title] [duration] [delete]
Drag handle:      Lucide GripVertical, 14px, --text-tertiary
Source icon:      YouTube/Music, 16px, --text-tertiary
Title:            13px, --text-primary, flex-grow, truncate
Duration:         13px, --text-tertiary, 48px fixed width
Delete:           Lucide Trash2, 14px, opacity 0 → 1 on row hover (150ms)
Hover:            Background --surface-3
Border-bottom:    1px solid --border-subtle
```

### Add Track Modal — Desktop

```
Width:            480px
Background:       --surface-1
Border:           1px solid --border
Radius:           10px
Shadow:           0 24px 48px rgba(0,0,0,0.4)
Tabs:             "YouTube" | "Local File" (shadcn Tabs)

YouTube tab:      Full-width Input, placeholder "Paste YouTube URL...", primary Add button
Local file tab:   Dashed-border drop zone, 120px tall, accepts .mp3/.wav/.ogg/.flac
                  Drag-over: border → --accent, bg → --accent-muted
```

---

## Phone Remote — Full Layout

```
┌─────────────────────────────┐
│ [Campaign Name ▾]      [●]  │  ← Header: 48px, --surface-1
├─────────────────────────────┤
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │  ⚔️       │ │  🛡️       │  │  ← Climate grid: 2 columns
│  │ Combat   │ │ Boss     │  │     12px gap, 16px horizontal padding
│  └──────────┘ └──────────┘  │     Cards stretch vertically to fill
│  ┌──────────┐ ┌──────────┐  │
│  │  🌲       │ │  🍺       │  │
│  │ Forest   │ │ Tavern   │  │
│  └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐  │
│  │  🔮       │ │  👁️       │  │
│  │ Magic    │ │ Mystery  │  │
│  └──────────┘ └──────────┘  │
│                             │
├─────────────────────────────┤
│  🎵 Epic Battle Theme...  ⏭  │  ← Now playing: 52px
├─────────────────────────────┤
│  🔊 ═══════════════●══  🔇  │  ← Controls: 72px
└─────────────────────────────┘
```

**Campaign selector bottom sheet:** Triggered by tapping header. Slides up 300ms ease-out, --surface-1 background, 20px top border-radius, 40×4px pill handle, campaign list (56px items), active campaign highlighted with --accent-muted + checkmark. Tap backdrop (60% --background) to dismiss.

**Empty states:**

- No campaign: "Select a campaign to begin" + auto-show selector
- No climates: "No climates yet — add some on the desktop app"
- Disconnected: Full overlay with Lucide WifiOff (pulsing), "Reconnecting...", auto-retry 2s

---

## Desktop — Full Layout

```
┌────────────────────────────────────────────────────────┐
│ Sidebar (260px)  │  Main Content                       │
│                  │                                     │
│  AMBORA          │  Campaign: The Lost Mines  ✏️        │
│                  │  A homebrew campaign...              │
│  CAMPAIGNS       │                                     │
│  ● The Lost Mines│  CLIMATES                           │
│  ○ Curse of...   │  ┌────────┐ ┌────────┐ ┌────────┐  │
│  ○ Homebrew      │  │▌Combat │ │▌Tavern │ │▌Forest │  │
│  + New Campaign  │  │ 5 trks │ │ 3 trks │ │ 4 trks │  │
│                  │  └────────┘ └────────┘ └────────┘  │
│                  │  ┌────────┐ ┌────────┐ ┌ ─ ─ ─ ┐   │
│                  │  │▌Mystery│ │▌Boss   │ │+ Add  │   │
│  CONNECT PHONE   │  │ 2 trks │ │ 4 trks │ │       │   │
│  ┌──────────┐    │  └────────┘ └────────┘ └ ─ ─ ─ ┘   │
│  │ QR CODE  │    │                                     │
│  └──────────┘    │                                     │
│  192.168.1.5     │                                     │
│  ● Connected     │                                     │
├──────────────────┴─────────────────────────────────────┤
│  ● Combat  │  🎵 Epic Battle Theme      ⏭ 🔊━━━━━━━━━━│  ← Now Playing: 64px
└────────────────────────────────────────────────────────┘
```

**Responsive:** Climate grid uses CSS Grid auto-fit to adjust columns. Climate detail panel replaces grid on windows < 1100px; becomes a 400px side panel on wider windows.

---

## Interaction Feedback

Every action must provide immediate feedback.

| Action                      | Feedback                                                            |
| --------------------------- | ------------------------------------------------------------------- |
| Tap climate (phone)         | Haptic (40ms), instant highlight, glow begins                       |
| Tap skip (phone)            | Track title fades out/in                                            |
| Drag volume (phone)         | Instant visual, no haptic                                           |
| Tap fade-to-silence (phone) | Icon changes to Play, bg shifts                                     |
| Add track (desktop)         | Track appears with 200ms fade-in                                    |
| Delete track (desktop)      | 200ms fade-out, list reflows                                        |
| Delete campaign (desktop)   | AlertDialog confirmation first                                      |
| Phone connects              | Desktop green dot + sonner toast                                    |
| YouTube error               | Sonner toast: "Track unavailable, skipping..." (3s)                 |
| Climate switch              | Phone: card highlights. Desktop: now-playing updates with color dot |

---

## Tailwind / shadcn Theme Configuration

In `src/renderer/src/index.css`:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@fontsource-variable/inter';

@theme inline {
  --font-sans:
    'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --radius: 0.625rem;
}

:root {
  --background: 240 6% 5%;
  --foreground: 240 5% 93%;
  --card: 240 6% 8%;
  --card-foreground: 240 5% 93%;
  --popover: 240 6% 8%;
  --popover-foreground: 240 5% 93%;
  --primary: 230 85% 72%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 4% 14%;
  --secondary-foreground: 240 5% 93%;
  --muted: 240 4% 14%;
  --muted-foreground: 240 5% 60%;
  --accent: 240 4% 14%;
  --accent-foreground: 240 5% 93%;
  --destructive: 0 72% 69%;
  --destructive-foreground: 0 0% 100%;
  --border: 240 5% 18%;
  --input: 240 5% 18%;
  --ring: 230 85% 72%;
}
```

Add `class="dark"` to root `<html>`. Dark-mode only — no light toggle.

---

## Project Structure

```
ambora/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Lint + typecheck + build on every PR
│   │   ├── release.yml             # Build & publish installers on tag push
│   │   └── dependabot-automerge.yml # Optional: auto-merge patch updates
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml          # Structured bug report form
│   │   └── feature_request.yml     # Feature request form
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── dependabot.yml              # Automated dependency updates
│   └── CODEOWNERS
├── docs/
│   └── ARCHITECTURE.md             # Technical architecture overview
├── src/
│   ├── main/                       # Electron main process
│   │   ├── index.ts                # App entry, window creation
│   │   ├── server.ts               # Express + WebSocket server
│   │   └── data.ts                 # JSON persistence layer
│   ├── preload/
│   │   └── index.ts                # Preload script for IPC
│   └── renderer/                   # Desktop React app
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── index.css           # Tailwind v4 + shadcn theme
│       │   ├── components/
│       │   │   ├── ui/             # shadcn/ui (auto-generated, do not edit directly)
│       │   │   ├── Sidebar.tsx
│       │   │   ├── CampaignView.tsx
│       │   │   ├── ClimateGrid.tsx
│       │   │   ├── ClimateDetail.tsx
│       │   │   ├── TrackList.tsx
│       │   │   ├── AddTrackModal.tsx
│       │   │   ├── NowPlayingBar.tsx
│       │   │   ├── QRCodePanel.tsx
│       │   │   ├── ColorPicker.tsx
│       │   │   ├── IconPicker.tsx
│       │   │   └── Settings.tsx
│       │   ├── store/
│       │   │   ├── campaignStore.ts
│       │   │   └── audioStore.ts
│       │   ├── audio/
│       │   │   ├── AudioEngine.ts
│       │   │   ├── LocalPlayer.ts
│       │   │   ├── YouTubePlayer.ts
│       │   │   └── CrossfadeManager.ts
│       │   └── lib/
│       │       ├── utils.ts        # shadcn cn() utility
│       │       ├── types.ts        # Shared TypeScript interfaces
│       │       └── constants.ts    # Colors, icons, defaults
│       └── index.html
├── remote/                         # Phone remote (NOT part of renderer build)
│   ├── index.html
│   ├── remote.css
│   └── remote.js                   # Vanilla JS — keep bundle tiny
├── resources/                      # App icons, installer assets
├── tests/
│   ├── unit/                       # Vitest unit tests
│   └── e2e/                        # Playwright e2e tests (scaffolded for future)
├── scripts/
│   └── generate-icons.ts           # Utility to generate app icons from SVG
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── electron.vite.config.ts
├── components.json                 # shadcn/ui config
├── eslint.config.js                # ESLint 9 flat config
├── .prettierrc                     # Prettier config
├── .editorconfig
├── .gitignore
├── .husky/
│   └── pre-commit                  # Runs lint-staged
├── LICENSE                         # MIT License
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
└── SECURITY.md
```

**Key notes:**

- `remote/` is served as static files by Express. NOT part of Electron renderer build. Use vanilla JS, not React.
- shadcn components go in `src/renderer/src/components/ui/` — install via `npx shadcn@latest add <component>`
- `electron.vite.config.ts` must include `@tailwindcss/vite` in renderer plugins
- Zustand stores are the single source of truth, with WebSocket sync pushing to phone

---

## Implementation Notes

### electron-vite Setup

```bash
npm create @quick-start/electron@latest ambora -- --template react-ts
cd ambora
npm install
```

In `electron.vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    plugins: [react(), tailwindcss()],
  },
})
```

Initialize shadcn: `npx shadcn@latest init` → "new-york" style, alias `@/components`.

### Tailwind CSS v4

- Config in CSS via `@theme` / `@theme inline`, NOT `tailwind.config.js`
- Import: `@import "tailwindcss"` (NOT old `@tailwind base; ...`)
- `@tailwindcss/vite` handles everything — no PostCSS config needed
- CSS variables in OKLCH by default with shadcn

### YouTube IFrame API

- Load dynamically: `https://www.youtube.com/iframe_api`
- Pool of 2 player instances (Channel A/B)
- Pre-buffer: `player.cueVideoById()` for non-playing climates
- Handle `onError`: skip + toast. Handle `onStateChange` (state 0 = ended).

### Cross-Platform

- Local IP: `os.networkInterfaces()`, filter out loopback
- Windows firewall: show helpful message if phone can't connect
- File paths: `path.join`, normalize for cross-platform
- Audio device selection: `setSinkId` on HTMLAudioElement

### Data Persistence

- Location: `app.getPath('userData')/ambora-data/campaigns.json`
- Save on every change, debounced 500ms
- No database for v1

### Error Handling

| Scenario           | Behavior                                                |
| ------------------ | ------------------------------------------------------- |
| YouTube fails      | Skip to next track, sonner toast                        |
| Local file missing | Skip, mark as broken in UI                              |
| Phone disconnects  | Desktop continues, phone shows "Reconnecting..."        |
| No internet        | YouTube won't work, local files continue, clear message |
| Port in use        | Try next port, update QR/URL                            |

---

## Open Source Project Files

All files below must be created as part of the initial project scaffolding, **before any feature code is written**.

### LICENSE (MIT)

```
MIT License

Copyright (c) 2026 Jonathan Leibiusky

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### README.md

Write a README that includes:

1. **Hero section**: App name, one-line description ("Atmospheric music for your TTRPG sessions, controlled from your phone"), badges (CI status, license, latest release, platform support)
2. **Screenshot/GIF**: Placeholder comment for future screenshot of desktop + phone side by side
3. **Features list**: One-tap climate switching, crossfade, phone remote via QR, YouTube + local files, campaign/climate organization, dark UI
4. **Quick start**: Prerequisites (Node.js 20+), clone, `npm install`, `npm run dev`
5. **Usage guide**: Brief walkthrough — create campaign → add climates → add tracks → scan QR → play
6. **Download section**: Link to GitHub Releases for pre-built installers (macOS, Windows, Linux)
7. **Tech stack**: Brief list with links
8. **Contributing**: Link to CONTRIBUTING.md
9. **License**: MIT
10. **Acknowledgments**: Lucide icons, shadcn/ui, Electron, YouTube IFrame API

### CONTRIBUTING.md

Write contribution guidelines that include:

1. **Welcome message**: Friendly, encouraging tone. Open to all skill levels.
2. **Ways to contribute**: Bug reports, feature requests, code, documentation, translations, design
3. **Development setup**:
   - Prerequisites: Node.js 20+, npm 10+, Git
   - Fork and clone
   - `npm install`
   - `npm run dev` (starts Electron with hot reload)
   - `npm run lint` (ESLint)
   - `npm run typecheck` (TypeScript)
   - `npm run build` (production build)
4. **Branch naming**: `feature/description`, `fix/description`, `docs/description`
5. **Commit messages**: Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
6. **Pull request process**: Fill out PR template, ensure CI passes, request review
7. **Code style**: ESLint + Prettier enforced via pre-commit hooks; TypeScript strict mode; component files are PascalCase, utility files camelCase
8. **Architecture overview**: Link to docs/ARCHITECTURE.md
9. **Issue guidelines**: Use templates, include reproduction steps for bugs

### CODE_OF_CONDUCT.md

Use the **Contributor Covenant v2.1** (the standard). Include enforcement section with contact email placeholder.

### SECURITY.md

```markdown
# Security Policy

## Supported Versions

| Version  | Supported |
| -------- | --------- |
| latest   | ✅        |
| < latest | ❌        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue.**
2. Email security@ambora.app (or use GitHub's private vulnerability reporting).
3. Include a description, steps to reproduce, and potential impact.
4. We will respond within 48 hours and work with you on a fix.

## Security Considerations

Ambora runs a local HTTP/WebSocket server on your network. This server:

- Only binds to the local network interface
- Does not expose any data to the internet
- Does not require authentication (anyone on your local network can connect)
- Does not transmit sensitive data

If you are on an untrusted network, be aware that other devices on the same network could access the phone remote.
```

### CHANGELOG.md

Use [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Initial release
- Campaign and climate management
- YouTube and local file playback with crossfading
- Phone remote control via local network
- QR code connection flow
```

### .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  build:
    needs: lint-and-typecheck
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

### .github/workflows/release.yml

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  build-and-release:
    strategy:
      matrix:
        include:
          - os: macos-latest
            platform: mac
          - os: ubuntu-latest
            platform: linux
          - os: windows-latest
            platform: win
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Publish
        run: npx electron-builder --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### .github/ISSUE_TEMPLATE/bug_report.yml

```yaml
name: Bug Report
description: Report a bug in Ambora
labels: ['bug', 'triage']
body:
  - type: markdown
    attributes:
      value: Thanks for taking the time to report a bug!
  - type: input
    id: version
    attributes:
      label: Ambora Version
      placeholder: e.g., 1.0.0
    validations:
      required: true
  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - macOS
        - Windows
        - Linux
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: What happened?
      placeholder: Describe the bug...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: What did you expect to happen?
    validations:
      required: true
  - type: textarea
    id: reproduce
    attributes:
      label: Steps to reproduce
      value: |
        1.
        2.
        3.
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: Relevant logs or screenshots
      description: Paste any error messages or attach screenshots
```

### .github/ISSUE_TEMPLATE/feature_request.yml

```yaml
name: Feature Request
description: Suggest a feature for Ambora
labels: ['enhancement']
body:
  - type: markdown
    attributes:
      value: We'd love to hear your ideas!
  - type: textarea
    id: problem
    attributes:
      label: What problem does this solve?
      placeholder: Describe the problem or use case...
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Describe your proposed solution
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives you've considered
```

### .github/PULL_REQUEST_TEMPLATE.md

```markdown
## What does this PR do?

<!-- Brief description of the changes -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor (no functional change)
- [ ] Documentation
- [ ] CI/build

## Checklist

- [ ] I've tested this on my local machine
- [ ] TypeScript compiles with no errors (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] I've updated documentation if needed
- [ ] I've added/updated tests if applicable
- [ ] My commits follow [Conventional Commits](https://www.conventionalcommits.org/)

## Screenshots (if UI changes)

<!-- Add before/after screenshots -->
```

### .github/dependabot.yml

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    groups:
      production-dependencies:
        patterns: ['*']
        exclude-patterns: ['eslint*', 'prettier*', '@types/*']
      dev-dependencies:
        patterns: ['eslint*', 'prettier*', '@types/*']
    open-pull-requests-limit: 10
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'monthly'
```

### .editorconfig

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

### .prettierrc

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### eslint.config.js (ESLint 9 flat config)

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'out/**', 'node_modules/**', 'src/renderer/src/components/ui/**'],
  },
)
```

Note: Ignore `components/ui/` because shadcn-generated files have their own style.

### .gitignore

```
node_modules/
dist/
out/
build/
*.dmg
*.exe
*.AppImage
*.deb
*.snap
.DS_Store
Thumbs.db
*.log
.env
.env.local
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepare": "husky",
    "postinstall": "electron-builder install-app-deps",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "dist:mac": "electron-builder --mac",
    "dist:win": "electron-builder --win",
    "dist:linux": "electron-builder --linux"
  }
}
```

### Husky + lint-staged

```bash
npx husky init
```

In `.husky/pre-commit`:

```bash
npx lint-staged
```

In `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"]
  }
}
```

### docs/ARCHITECTURE.md

Write a technical architecture document that covers:

1. **System overview**: Desktop app (Electron) = setup + audio engine. Phone remote = web page on local network. Communication via WebSocket.
2. **Process model**: Electron main process (Node.js: server, data persistence, IPC) ↔ Renderer process (React: desktop UI, audio engine) ↔ Phone remote (vanilla JS via WebSocket)
3. **Audio engine**: Dual-channel crossfade architecture. Channel A/B alternation. Pre-buffering strategy. Volume control via Web Audio API gain nodes (local) and YouTube API setVolume (YouTube).
4. **Data flow**: Zustand stores → JSON persistence (debounced). WebSocket pushes state updates to phone. Phone sends commands back.
5. **Network**: Express serves phone remote as static files. WebSocket on same port for real-time communication. QR code encodes local URL.
6. **Directory structure**: Brief explanation of each top-level directory

---

## Accessibility

Even in a dark-themed niche app, accessibility matters:

- All interactive elements keyboard-navigable (desktop)
- Focus rings: 2px `--accent`, offset 2px
- Minimum contrast ratio 4.5:1 for all readable text
- Climate colors never the sole indicator — always paired with icon + name
- Screen reader: Climate cards announce "Combat climate, 5 tracks"
- Respect `prefers-reduced-motion`: disable glow pulse and spring animations, use instant transitions

---

## Versioning

Follow **Semantic Versioning (SemVer)**:

- `MAJOR.MINOR.PATCH` (e.g., `1.0.0`)
- PATCH: bug fixes
- MINOR: new features, backwards-compatible
- MAJOR: breaking changes

Tag releases as `v1.0.0`, `v1.1.0`, etc. Use GitHub Releases with auto-generated release notes + the CHANGELOG entry.

---

## Build Order

1. **Project scaffolding + open source setup**: Scaffold with electron-vite. Create ALL open source files (LICENSE, README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, .editorconfig, .prettierrc, eslint.config.js, .gitignore, .github/ directory with CI, issue templates, PR template, dependabot). Set up Husky + lint-staged. Add Tailwind v4, init shadcn, install shadcn components. Verify `npm run dev` works, `npm run lint` passes, `npm run typecheck` passes.
2. **Data layer**: TypeScript interfaces, Campaign/Climate/Track CRUD, JSON persistence, Zustand stores
3. **Desktop UI shell**: Sidebar, campaign view, climate grid (shadcn Card), climate detail with track management (Dialog, Tabs, Input, Slider, Sheet)
4. **Audio engine**: Local file playback with crossfade first (Web Audio API gain nodes)
5. **Local server + WebSocket**: Express inside Electron main process, WebSocket protocol
6. **Phone remote**: Full remote control interface (vanilla JS, NOT React)
7. **YouTube integration**: IFrame API players, pre-buffering
8. **QR code connection**: `qrcode` package, auto-detect local IP
9. **Polish**: Animations, haptic feedback, error handling, toasts, empty states
10. **Packaging**: electron-builder for macOS (.dmg), Windows (.exe), Linux (.AppImage)
