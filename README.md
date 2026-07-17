# Ambora

**Atmospheric music manager for tabletop RPG sessions with phone remote control.**

[![CI](https://github.com/xetorthio/ambora/actions/workflows/ci.yml/badge.svg)](https://github.com/xetorthio/ambora/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- **Campaign-based organization** — Group climates and tracks by campaign for easy session prep
- **One-tap climate switching** — Switch between combat, tavern, forest, and more from your phone
- **Smooth crossfading** — Configurable crossfade between climates for seamless transitions
- **YouTube + local files** — Mix YouTube tracks and local audio files (MP3, WAV, OGG, FLAC)
- **Phone remote control** — Control playback from any phone on your local WiFi via QR code
- **Fully offline** — No internet required for local file playback (YouTube needs connectivity)
- **Cross-platform** — macOS, Windows, and Linux

## Install

Download the installer for your platform from the [latest release](https://github.com/xetorthio/ambora/releases/latest).

### macOS

Ambora is not yet signed with an Apple Developer ID or notarized, so macOS
Gatekeeper blocks it on first launch. After downloading and moving `Ambora.app`
to your Applications folder:

- **Recommended:** right-click (or Control-click) `Ambora.app` → **Open**, then
  confirm **Open** in the dialog. You only need to do this once.
- If macOS still refuses, remove the download-quarantine flag from Terminal
  (adjust the path if the app is elsewhere), then open it normally:

  ```bash
  xattr -cr /Applications/Ambora.app
  ```

> **Note:** builds before v0.2.1 could report _"Ambora.app is damaged and can't be
> opened"_ due to a code-signing bug in the release pipeline. That is fixed as of
> v0.2.1 — if you still see it, download the latest release.

### Windows

Windows SmartScreen may warn that the app is from an unknown publisher. Click
**More info → Run anyway**.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20.x or later
- npm 10.x or later

### Development

```bash
# Clone the repository
git clone https://github.com/xetorthio/ambora.git
cd ambora

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Build

```bash
# Production build
npm run build

# Build installer for your platform
npm run dist
```

## Usage

1. **Create a campaign** — Set up a campaign for your adventure
2. **Add climates** — Create moods like "Tavern", "Combat", "Forest" with colors and icons
3. **Add tracks** — Paste YouTube URLs or pick local audio files for each climate
4. **Start a session** — Click the QR code icon, scan from your phone
5. **Play** — Tap climates on your phone to switch music with smooth crossfading

## Tech Stack

- **Desktop**: Electron + React + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Audio**: Web Audio API + YouTube IFrame API
- **State**: Zustand
- **Remote**: Express + WebSocket over local WiFi
- **Build**: electron-vite + electron-builder

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a PR.

## License

[MIT](LICENSE) — Jonathan Leibiusky (@xetorthio)

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Lucide](https://lucide.dev/) for the icon set
- [electron-vite](https://electron-vite.org/) for the build tooling
