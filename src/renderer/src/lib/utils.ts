import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || seconds < 0) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export async function getLocalFileDuration(filePath: string): Promise<number | undefined> {
  const token = await window.api.registerAudioPath(filePath)
  const audio = new Audio()
  audio.src = `local-audio:///${token}`

  return new Promise<number | undefined>((resolve) => {
    const cleanup = (): void => {
      audio.removeAttribute('src')
      audio.load()
    }

    audio.addEventListener(
      'loadedmetadata',
      () => {
        const dur = audio.duration
        cleanup()
        resolve(Number.isFinite(dur) ? dur : undefined)
      },
      { once: true },
    )

    audio.addEventListener(
      'error',
      () => {
        cleanup()
        resolve(undefined)
      },
      { once: true },
    )

    audio.load()
  })
}
