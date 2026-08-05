import { describe, it, expect } from 'vitest'
import { localAudioUrl } from '../../src/renderer/src/lib/localAudioUrl'
import { tokenFromLocalAudioUrl } from '../../src/shared/localAudioUrl'

describe('localAudioUrl', () => {
  it('uses host media and puts the token in the pathname', () => {
    const href = localAudioUrl('token-abc')
    const url = new URL(href)
    expect(url.protocol).toBe('local-audio:')
    expect(url.hostname).toBe('media')
    expect(decodeURIComponent(url.pathname.slice(1))).toBe('token-abc')
    expect(url.searchParams.get('r')).toBeTruthy()
  })

  it('emits a unique nonce per call', () => {
    const a = localAudioUrl('token-abc')
    const b = localAudioUrl('token-abc')
    expect(a).not.toBe(b)
  })
})

describe('tokenFromLocalAudioUrl', () => {
  it('reads the token from the canonical media host form', () => {
    expect(tokenFromLocalAudioUrl('local-audio://media/token-abc?r=xyz')).toBe('token-abc')
  })

  it('reads the token when Chromium puts it in the hostname (issue #22)', () => {
    // Packaged macOS request shape reported in #22.
    expect(
      tokenFromLocalAudioUrl(
        'local-audio://43d0ceb6-4d64-4a5d-9155-6eac99ac49eb/?r=73ceea6a-587a-4104-a081-962a15f1c5fb',
      ),
    ).toBe('43d0ceb6-4d64-4a5d-9155-6eac99ac49eb')
  })

  it('reads the token from a path-only triple-slash URL', () => {
    expect(tokenFromLocalAudioUrl('local-audio:///token-abc?r=xyz')).toBe('token-abc')
  })

  it('returns null for unknown hosts or empty tokens', () => {
    expect(tokenFromLocalAudioUrl('local-audio://other/token-abc')).toBeNull()
    expect(tokenFromLocalAudioUrl('local-audio://media/')).toBeNull()
    expect(tokenFromLocalAudioUrl('https://example.com/x')).toBeNull()
  })

  it('round-trips with localAudioUrl()', () => {
    const href = localAudioUrl('round-trip-token')
    expect(tokenFromLocalAudioUrl(href)).toBe('round-trip-token')
  })
})
