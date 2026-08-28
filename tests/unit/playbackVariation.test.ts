import { describe, expect, it } from 'vitest'
import {
  clampPitchVariation,
  randomPlaybackRate,
} from '../../src/renderer/src/audio/playbackVariation'

describe('playback variation', () => {
  it('keeps disabled variation at the authored speed', () => {
    expect(randomPlaybackRate(0, () => 0.9)).toBe(1)
    expect(randomPlaybackRate(undefined, () => 0.1)).toBe(1)
  })

  it('uses a symmetric range around the authored speed', () => {
    expect(randomPlaybackRate(10, () => 0)).toBeCloseTo(0.9)
    expect(randomPlaybackRate(10, () => 0.5)).toBeCloseTo(1)
    expect(randomPlaybackRate(10, () => 1)).toBeCloseTo(1.1)
  })

  it('clamps malformed or excessive configuration', () => {
    expect(clampPitchVariation(-5)).toBe(0)
    expect(clampPitchVariation(50)).toBe(20)
    expect(clampPitchVariation(Number.NaN)).toBe(0)
  })
})
