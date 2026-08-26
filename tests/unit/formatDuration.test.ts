import { describe, expect, it } from 'vitest'
import { formatDuration } from '../../src/renderer/src/lib/utils'

describe('formatDuration', () => {
  it('renders a placeholder for values it cannot express', () => {
    expect(formatDuration(undefined)).toBe('--:--')
    expect(formatDuration(-1)).toBe('--:--')
  })

  it('rejects non-finite values', () => {
    // Regression: a bare `seconds < 0` guard let these through as "NaN:NaN"
    // and "Infinity:NaN". NaN arrives before media metadata loads; Infinity
    // from VBR MP3s without a Xing header.
    expect(formatDuration(NaN)).toBe('--:--')
    expect(formatDuration(Infinity)).toBe('--:--')
    expect(formatDuration(-Infinity)).toBe('--:--')
  })

  it('zero-pads seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(9)).toBe('0:09')
    expect(formatDuration(60)).toBe('1:00')
  })

  it('floors rather than rounds', () => {
    expect(formatDuration(59.9)).toBe('0:59')
    expect(formatDuration(97.6)).toBe('1:37')
  })

  it('formats typical track lengths', () => {
    expect(formatDuration(97)).toBe('1:37')
    expect(formatDuration(171)).toBe('2:51')
    expect(formatDuration(599)).toBe('9:59')
    expect(formatDuration(600)).toBe('10:00')
    expect(formatDuration(3599)).toBe('59:59')
  })

  it('rolls over to hours past 60 minutes', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(4205)).toBe('1:10:05')
  })
})
