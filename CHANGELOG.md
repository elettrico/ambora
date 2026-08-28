# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2026-08-28

### Added

- Campaign-wide soundboard with keyboard shortcuts, configurable retrigger modes,
  circular playback indicators, Lucide icons, bulk audio import, and phone remote controls
- Toggle-based Soundboard Loop mode with synchronized desktop/phone activity,
  a rotating infinite indicator, and a fixed 400ms stop fade
- Random 0–20% pitch/speed variation for Soundboard sounds and Ambient Layers,
  including persisted campaign export/import settings
- Playback progress indicator in the Now Playing bar

## [0.7.3] - 2026-08-07

### Fixed

- Defer ambient random-delay validation until the edit completes
- Harden packaging, the remote protocol, and campaign persistence
- Skip the shared `builder-debug.yml` when uploading release artifacts

## [0.7.2] - 2026-08-05

### Fixed

- Probe imported audio with FFmpeg on Apple Silicon

## [0.7.1] - 2026-08-05

### Fixed

- Resolve local-audio tokens under standard URL parsing

## [0.7.0] - 2026-08-05

### Changed

- Move LUFS analysis to FFmpeg and harden local audio import
- Document ambient layers and signed macOS builds on the website

### Fixed

- Harden local-audio loads, climate probes, and YouTube bootstrap

## [0.6.0] - 2026-08-04

### Fixed

- Stop requesting screen recording, camera, and microphone permissions on macOS

### Changed

- Build macOS for Intel as well, and bound release job runtimes

## [0.5.0] - 2026-08-04

### Added

- Ambient sound layers with random events

### Changed

- Sign and notarize macOS builds, install the Apple Developer ID G2 intermediate,
  and fail the build when signing or notarization is missing

### Fixed

- Resolve duration for VBR MP3s with no Xing header
- Allow `fetch()` of the local-audio protocol
- Don't ad-hoc re-sign a properly signed macOS app

## [0.4.0] - 2026-07-31

### Added

- Surface unplayable tracks in the UI

### Fixed

- Resilient local-file playback (#9)

## [0.3.0] - 2026-07-23

### Added

- Per-track play button in climate detail (#7)

### Fixed

- Disable YouTube AGC on Linux to stop screen-capture prompts (#6)

## [0.2.2] - 2026-07-20

### Added

- Crossfade between tracks within a climate; quiet rapid-skip

### Fixed

- Produce a valid ad-hoc macOS signature for unsigned builds

## [0.2.1] - 2026-07-16

### Changed

- Reduce redundant disk I/O for local track normalization
- Bump electron-builder to 26.15.3

### Fixed

- Honor HTTP Range requests in the local-audio protocol handler

## [0.2.0] - 2026-03-02

### Added

- Campaign export/import (`.ambora` files)
- Show the app version in the window title

## [0.1.1] - [0.1.8] - 2026-03-02

### Fixed

- macOS packaging: ad-hoc signing, entitlements, and hardened runtime to resolve
  DMG launch crashes
- Release workflow: draft-release creation, artifact upload, and generated notes

## [0.1.0] - 2026-03-02

### Added

- Initial project scaffolding with electron-vite + React + TypeScript
- Tailwind CSS v4 dark theme with design system
- shadcn/ui component library
- ESLint, Prettier, Husky + lint-staged tooling
- CI/CD workflows for GitHub Actions
- Data layer with JSON persistence, IPC bridge, and Zustand stores
- Desktop UI shell with sidebar, campaign management, climate grid, and now-playing bar
- Audio engine with dual-channel crossfade and local file playback
- Express + WebSocket server and phone remote UI with climate grid and playback controls
- YouTube playback integration
- Automatic audio normalization and dynamic compression
- Shuffle mode, per-climate playback position resume, and mute toggle
- QR code connection panel for phone remote
- Starter campaign with 15 RPG climates and verified YouTube tracks
- Ambora logo, brand assets, and landing page
