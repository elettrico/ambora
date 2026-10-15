export const REMOTE_LABEL_MAX_LENGTH = 3

/** Generate a short code from a climate name for the phone remote. */
export function remoteLabelFallback(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)

  if (words.length >= REMOTE_LABEL_MAX_LENGTH) {
    return words
      .slice(0, REMOTE_LABEL_MAX_LENGTH)
      .map((word) => word[0])
      .join('')
      .toLocaleUpperCase()
  }
  if (words.length === 2) {
    const first = words[0].slice(0, 2)
    return (first + words[1].slice(0, REMOTE_LABEL_MAX_LENGTH - first.length)).toLocaleUpperCase()
  }
  return (words[0] ?? '').slice(0, REMOTE_LABEL_MAX_LENGTH).toLocaleUpperCase()
}

/** Normalize an author-entered remote code. */
export function normalizeRemoteLabel(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, REMOTE_LABEL_MAX_LENGTH)
    .toLocaleUpperCase()
}

/** Resolve the label that is sent to the remote, always producing a value. */
export function resolveRemoteLabel(name: string, customLabel?: string): string {
  return normalizeRemoteLabel(customLabel ?? '') || remoteLabelFallback(name) || '---'
}
