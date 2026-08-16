import { describe, expect, it } from 'vitest'
import { soundboardTriggerAction } from '../../src/renderer/src/audio/SoundboardEngine'

describe('soundboardTriggerAction', () => {
  it('starts an inactive loop and stops an active one', () => {
    expect(soundboardTriggerAction('loop', false, false)).toBe('start')
    expect(soundboardTriggerAction('loop', true, false)).toBe('stop')
  })

  it('cancels a loop that is still loading', () => {
    expect(soundboardTriggerAction('loop', false, true)).toBe('stop')
  })

  it('preserves the existing retrigger semantics', () => {
    expect(soundboardTriggerAction('ignore', true, false)).toBe('ignore')
    expect(soundboardTriggerAction('stop', true, false)).toBe('stop')
    expect(soundboardTriggerAction('restart', true, false)).toBe('restart')
    expect(soundboardTriggerAction('multiple', true, false)).toBe('start')
  })
})
