import { describe, it, expect } from 'vitest'
import { localAudioUrl } from '../../src/renderer/src/lib/localAudioUrl'

describe('localAudioUrl', () => {
  it('embeds the token in the path and a unique nonce query', () => {
    const a = localAudioUrl('token-abc')
    const b = localAudioUrl('token-abc')
    expect(a).toMatch(/^local-audio:\/\/\/token-abc\?r=/)
    expect(b).toMatch(/^local-audio:\/\/\/token-abc\?r=/)
    expect(a).not.toBe(b)
  })
})
