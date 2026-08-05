/**
 * Build a unique local-audio:// URL for a registered path token.
 *
 * A per-load nonce query keeps Chromium from coalescing / caching concurrent
 * loads of the same token (probe + playback + ambient fetch), which can surface
 * as intermittent MEDIA_ERR_SRC_NOT_SUPPORTED (code 4). The main-process handler
 * ignores the query and keys only on the path token.
 */
export function localAudioUrl(token: string): string {
  const nonce = crypto.randomUUID()
  return `local-audio:///${token}?r=${nonce}`
}
