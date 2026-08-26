import { describe, expect, it } from 'vitest'
import { formatProgressText, progressFraction } from '../../src/renderer/src/lib/playbackProgress'

describe('progressFraction', () => {
  it('returns null when the duration is unusable', () => {
    // YouTube reports nothing until playback starts; a VBR MP3 without a Xing
    // header reports Infinity. Both must hide the bar, not pin it at 0%.
    expect(progressFraction(10, undefined)).toBeNull()
    expect(progressFraction(10, 0)).toBeNull()
    expect(progressFraction(10, -5)).toBeNull()
    expect(progressFraction(10, Infinity)).toBeNull()
    expect(progressFraction(10, NaN)).toBeNull()
  })

  it('returns null for a non-finite position', () => {
    expect(progressFraction(NaN, 60)).toBeNull()
    expect(progressFraction(Infinity, 60)).toBeNull()
  })

  it('clamps to the start', () => {
    expect(progressFraction(0, 60)).toBe(0)
    expect(progressFraction(-3, 60)).toBe(0)
  })

  it('clamps to the end so the bar never overshoots', () => {
    expect(progressFraction(60, 60)).toBe(1)
    expect(progressFraction(61, 60)).toBe(1)
  })

  it('reports the raw fraction in between', () => {
    expect(progressFraction(30, 60)).toBe(0.5)
    expect(progressFraction(37, 60)).toBe(37 / 60)
  })
})

describe('formatProgressText', () => {
  it('renders elapsed over total', () => {
    expect(formatProgressText(97, 171)).toBe('1:37 / 2:51')
    expect(formatProgressText(0, 171)).toBe('0:00 / 2:51')
  })

  it('falls back to a placeholder for an unknown total', () => {
    expect(formatProgressText(3, undefined)).toBe('0:03 / --:--')
    expect(formatProgressText(3, Infinity)).toBe('0:03 / --:--')
  })

  it('clamps a position that overshoots a stale duration', () => {
    // Media elements can report a currentTime a few ms past the duration at
    // end of track, which would otherwise render "2:52 / 2:51".
    expect(formatProgressText(171.4, 171)).toBe('2:51 / 2:51')
  })
})
