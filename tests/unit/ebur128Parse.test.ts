import { describe, it, expect } from 'vitest'
import { parseEbur128Integrated } from '../../src/main/lufsAnalyze'

describe('parseEbur128Integrated', () => {
  it('parses the Summary Integrated loudness I: line', () => {
    const stderr = `
[Parsed_ebur128_0 @ 0x0] Summary:

  Integrated loudness:
    I:         -21.8 LUFS
    Threshold: -31.8 LUFS

  Loudness range:
    LRA:         0.0 LU
`
    expect(parseEbur128Integrated(stderr)).toBeCloseTo(-21.8, 5)
  })

  it('falls back to the last standalone I: LUFS line', () => {
    const stderr = `
    I:         -14.0 LUFS
    I:         -12.5 LUFS
`
    expect(parseEbur128Integrated(stderr)).toBeCloseTo(-12.5, 5)
  })

  it('returns null when no loudness line is present', () => {
    expect(parseEbur128Integrated('size=N/A time=00:00:01')).toBeNull()
  })
})
