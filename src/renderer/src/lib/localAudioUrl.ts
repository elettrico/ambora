/**
 * Build a unique local-audio:// URL for a registered path token.
 *
 * With `standard: true` scheme privileges, Chromium treats
 * `local-audio:///<token>` as hostname=<token>, pathname="/", which broke
 * token lookup (issue #22). Use an explicit host and put the token in the path:
 *   local-audio://media/<token>?r=<nonce>
 *
 * The per-load nonce keeps Chromium from coalescing / caching concurrent loads
 * of the same token. The main-process handler ignores the query.
 */
export function localAudioUrl(token: string): string {
  const nonce = crypto.randomUUID()
  return `local-audio://media/${encodeURIComponent(token)}?r=${nonce}`
}
