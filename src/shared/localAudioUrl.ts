/**
 * Extract the path-registry token from a local-audio:// request URL.
 *
 * Canonical form (after #22): local-audio://media/<token>?r=<nonce>
 * Also accepts Chromium's normalization of the broken triple-slash form
 * (hostname=<token>, pathname="/") and the non-standard path-only form.
 */

export function tokenFromLocalAudioUrl(requestUrl: string): string | null {
  let url: URL
  try {
    url = new URL(requestUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'local-audio:') return null

  if (url.hostname === 'media') {
    const token = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    return token.length > 0 ? token : null
  }

  // Packaged Chromium with standard:true rewrote local-audio:///<token>
  // to hostname=<token>, pathname="/".
  if (url.hostname && (url.pathname === '/' || url.pathname === '')) {
    return url.hostname
  }

  // Empty host, token in path (what Node's URL parser does for ///token).
  if (!url.hostname) {
    const token = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
    return token.length > 0 ? token : null
  }

  return null
}
