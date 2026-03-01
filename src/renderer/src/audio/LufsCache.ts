const SAVE_DEBOUNCE_MS = 2000

export class LufsCache {
  private cache = new Map<string, number>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private dirty = false

  async loadFromDisk(): Promise<void> {
    const data = await window.api.loadLufsCache()
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        this.cache.set(key, value)
      }
    }
  }

  get(filePath: string): number | undefined {
    return this.cache.get(filePath)
  }

  has(filePath: string): boolean {
    return this.cache.has(filePath)
  }

  set(filePath: string, lufs: number): void {
    this.cache.set(filePath, lufs)
    this.dirty = true
    this.scheduleSave()
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.dirty) {
      this.persistToDisk()
    }
  }

  dispose(): void {
    this.flush()
    this.cache.clear()
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.persistToDisk()
    }, SAVE_DEBOUNCE_MS)
  }

  private persistToDisk(): void {
    const obj: Record<string, number> = {}
    for (const [key, value] of this.cache) {
      obj[key] = value
    }
    window.api.saveLufsCache(obj)
    this.dirty = false
  }
}
