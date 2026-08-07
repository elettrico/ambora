import { describe, expect, it } from 'vitest'
import { parseDelaySec } from '../../src/renderer/src/lib/parseDelaySec'

const bounds = { min: 1, max: 600 }

describe('parseDelaySec', () => {
  it('parses whole numbers within bounds', () => {
    expect(parseDelaySec('600', bounds)).toBe(600)
    expect(parseDelaySec('6', bounds)).toBe(6)
    expect(parseDelaySec('1', bounds)).toBe(1)
  })

  it('rounds and clamps to absolute bounds', () => {
    expect(parseDelaySec('6.4', bounds)).toBe(6)
    expect(parseDelaySec('6.6', bounds)).toBe(7)
    expect(parseDelaySec('0', bounds)).toBe(1)
    expect(parseDelaySec('999', bounds)).toBe(600)
  })

  it('returns null for empty or non-numeric input', () => {
    expect(parseDelaySec('', bounds)).toBeNull()
    expect(parseDelaySec('   ', bounds)).toBeNull()
    expect(parseDelaySec('abc', bounds)).toBeNull()
  })
})
