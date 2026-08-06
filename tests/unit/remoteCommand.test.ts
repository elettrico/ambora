import { describe, expect, it } from 'vitest'
import { parseRemoteCommand } from '../../src/shared/remoteCommand'

describe('parseRemoteCommand', () => {
  it('accepts known no-payload commands', () => {
    expect(parseRemoteCommand({ type: 'play-pause' })).toEqual({ type: 'play-pause' })
    expect(parseRemoteCommand({ type: 'skip-track' })).toEqual({ type: 'skip-track' })
    expect(parseRemoteCommand({ type: 'toggle-shuffle' })).toEqual({ type: 'toggle-shuffle' })
  })

  it('rejects unknown types and non-objects', () => {
    expect(parseRemoteCommand({ type: 'delete-everything' })).toBeNull()
    expect(parseRemoteCommand(null)).toBeNull()
    expect(parseRemoteCommand('play-pause')).toBeNull()
  })

  it('validates activate-climate payload', () => {
    expect(parseRemoteCommand({ type: 'activate-climate', payload: { climateId: 'c1' } })).toEqual({
      type: 'activate-climate',
      payload: { climateId: 'c1' },
    })
    expect(parseRemoteCommand({ type: 'activate-climate', payload: { climateId: '' } })).toBeNull()
    expect(parseRemoteCommand({ type: 'activate-climate' })).toBeNull()
  })

  it('clamps set-volume and rejects non-finite values', () => {
    expect(parseRemoteCommand({ type: 'set-volume', payload: { volume: 150 } })).toEqual({
      type: 'set-volume',
      payload: { volume: 100 },
    })
    expect(parseRemoteCommand({ type: 'set-volume', payload: { volume: -5 } })).toEqual({
      type: 'set-volume',
      payload: { volume: 0 },
    })
    expect(parseRemoteCommand({ type: 'set-volume', payload: { volume: NaN } })).toBeNull()
    expect(parseRemoteCommand({ type: 'set-volume', payload: { volume: 'loud' } })).toBeNull()
  })

  it('validates layer commands', () => {
    expect(
      parseRemoteCommand({
        type: 'set-layer-enabled',
        payload: { layerId: 'l1', enabled: true },
      }),
    ).toEqual({
      type: 'set-layer-enabled',
      payload: { layerId: 'l1', enabled: true },
    })
    expect(
      parseRemoteCommand({
        type: 'set-layer-volume',
        payload: { layerId: 'l1', volume: 40 },
      }),
    ).toEqual({
      type: 'set-layer-volume',
      payload: { layerId: 'l1', volume: 40 },
    })
    expect(parseRemoteCommand({ type: 'trigger-layer', payload: { layerId: 'l1' } })).toEqual({
      type: 'trigger-layer',
      payload: { layerId: 'l1' },
    })
    expect(
      parseRemoteCommand({
        type: 'set-layer-enabled',
        payload: { layerId: 'l1', enabled: 'yes' },
      }),
    ).toBeNull()
  })
})
