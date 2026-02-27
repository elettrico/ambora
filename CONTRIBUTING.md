# Contributing to Ambora

Thank you for your interest in contributing to Ambora! This document provides guidelines and information for contributors.

## Ways to Contribute

- **Bug reports** — Found a bug? [Open an issue](https://github.com/xetorthio/ambora/issues/new?template=bug_report.yml)
- **Feature requests** — Have an idea? [Open a feature request](https://github.com/xetorthio/ambora/issues/new?template=feature_request.yml)
- **Code contributions** — Fix bugs or implement features via pull requests
- **Documentation** — Improve docs, fix typos, add examples

## Development Setup

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- Git

### Getting Started

```bash
git clone https://github.com/xetorthio/ambora.git
cd ambora
npm install
npm run dev
```

### Available Commands

```bash
npm run dev          # Start Electron with hot reload
npm run build        # Production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript strict check
npm run format       # Format with Prettier
npm run format:check # Check formatting
npm run test         # Run tests
```

## Branch Naming

Use descriptive branch names with a prefix:

- `feature/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation changes
- `refactor/description` — Code refactoring
- `test/description` — Test additions or fixes

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `chore:` — Maintenance tasks
- `refactor:` — Code refactoring (no feature change)
- `test:` — Adding or updating tests

Examples:

```
feat: add climate reordering via drag-and-drop
fix: resolve crossfade timing on track end
docs: update README with new screenshots
```

## Pull Request Process

1. Fork the repository and create your branch from `main`
2. Make your changes following the code style guidelines below
3. Ensure all checks pass: `npm run lint && npm run typecheck && npm run build`
4. Write a clear PR description explaining what and why
5. Link any related issues

## Code Style

- **TypeScript strict mode** — No `any` types
- **Functional components** with hooks only (no class components)
- **PascalCase** for component files (`ClimateGrid.tsx`)
- **camelCase** for utility files (`campaignStore.ts`)
- **shadcn/ui components** live in `components/ui/` — do not edit them directly
- Formatting is enforced by Prettier via pre-commit hooks

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for an overview of the project architecture.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.
