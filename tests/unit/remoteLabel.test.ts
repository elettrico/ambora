import { describe, expect, it } from 'vitest'
import {
  normalizeRemoteLabel,
  remoteLabelFallback,
  resolveRemoteLabel,
} from '../../src/shared/remoteLabel'

describe('remoteLabelFallback', () => {
  it.each([
    ['la rana suelta', 'LRS'],
    ['maldita muerte', 'MAM'],
    ['el tambor', 'ELT'],
    ['i know', 'IKN'],
    ['malucos on the moon', 'MOT'],
  ])('derives %s as %s', (name, expected) => {
    expect(remoteLabelFallback(name)).toBe(expected)
  })
})

describe('resolveRemoteLabel', () => {
  it('uses a normalized custom code before falling back to the climate name', () => {
    expect(normalizeRemoteLabel('  b!a z  ')).toBe('BAZ')
    expect(resolveRemoteLabel('la rana suelta', '  b!a z  ')).toBe('BAZ')
    expect(resolveRemoteLabel('la rana suelta')).toBe('LRS')
  })
})
