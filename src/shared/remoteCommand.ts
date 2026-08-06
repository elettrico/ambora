import type { RemoteCommand } from './types'

const REMOTE_COMMAND_TYPES = new Set<RemoteCommand['type']>([
  'activate-climate',
  'play-pause',
  'skip-track',
  'set-volume',
  'toggle-shuffle',
  'set-layer-enabled',
  'set-layer-volume',
  'trigger-layer',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128
}

function clampVolume(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, value))
}

/**
 * Parse and validate a phone-remote WebSocket command.
 * Returns null for malformed / unknown messages (caller should drop them).
 */
export function parseRemoteCommand(raw: unknown): RemoteCommand | null {
  if (!isRecord(raw) || typeof raw.type !== 'string') return null
  if (!REMOTE_COMMAND_TYPES.has(raw.type as RemoteCommand['type'])) return null

  switch (raw.type) {
    case 'play-pause':
    case 'skip-track':
    case 'toggle-shuffle':
      return { type: raw.type }

    case 'activate-climate': {
      if (!isRecord(raw.payload) || !isNonEmptyString(raw.payload.climateId)) return null
      return { type: 'activate-climate', payload: { climateId: raw.payload.climateId } }
    }

    case 'set-volume': {
      if (!isRecord(raw.payload)) return null
      const volume = clampVolume(raw.payload.volume)
      if (volume === null) return null
      return { type: 'set-volume', payload: { volume } }
    }

    case 'set-layer-enabled': {
      if (!isRecord(raw.payload) || !isNonEmptyString(raw.payload.layerId)) return null
      if (typeof raw.payload.enabled !== 'boolean') return null
      return {
        type: 'set-layer-enabled',
        payload: { layerId: raw.payload.layerId, enabled: raw.payload.enabled },
      }
    }

    case 'set-layer-volume': {
      if (!isRecord(raw.payload) || !isNonEmptyString(raw.payload.layerId)) return null
      const volume = clampVolume(raw.payload.volume)
      if (volume === null) return null
      return {
        type: 'set-layer-volume',
        payload: { layerId: raw.payload.layerId, volume },
      }
    }

    case 'trigger-layer': {
      if (!isRecord(raw.payload) || !isNonEmptyString(raw.payload.layerId)) return null
      return { type: 'trigger-layer', payload: { layerId: raw.payload.layerId } }
    }

    default:
      return null
  }
}
