export interface VolumeController {
  rampTo(target: number, durationSec: number): void
  cancelRamp(): void
  setImmediate(value: number): void
  getValue(): number
}

export class GainNodeVolumeController implements VolumeController {
  constructor(private gainNode: GainNode) {}

  rampTo(target: number, durationSec: number): void {
    const now = this.gainNode.context.currentTime
    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now)
    this.gainNode.gain.linearRampToValueAtTime(target, now + durationSec)
  }

  cancelRamp(): void {
    const now = this.gainNode.context.currentTime
    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now)
  }

  setImmediate(value: number): void {
    const now = this.gainNode.context.currentTime
    this.gainNode.gain.cancelScheduledValues(now)
    this.gainNode.gain.setValueAtTime(value, now)
  }

  getValue(): number {
    return this.gainNode.gain.value
  }
}

export interface DirectVolumeTarget {
  setVolume(volume: number): void
}

export class DirectVolumeController implements VolumeController {
  private currentValue = 0
  private targetValue = 0
  private startValue = 0
  private startTime = 0
  private duration = 0
  private rafId: number | null = null

  constructor(private target: DirectVolumeTarget) {}

  rampTo(targetVolume: number, durationSec: number): void {
    this.cancelRaf()
    this.startValue = this.currentValue
    this.targetValue = targetVolume
    this.startTime = performance.now()
    this.duration = durationSec * 1000

    if (durationSec <= 0) {
      this.currentValue = targetVolume
      this.target.setVolume(targetVolume)
      return
    }

    this.tick()
  }

  cancelRamp(): void {
    this.cancelRaf()
  }

  setImmediate(value: number): void {
    this.cancelRaf()
    this.currentValue = value
    this.target.setVolume(value)
  }

  getValue(): number {
    return this.currentValue
  }

  dispose(): void {
    this.cancelRaf()
  }

  private tick = (): void => {
    const elapsed = performance.now() - this.startTime
    const progress = Math.min(elapsed / this.duration, 1)
    this.currentValue = this.startValue + (this.targetValue - this.startValue) * progress
    this.target.setVolume(this.currentValue)

    if (progress < 1) {
      this.rafId = requestAnimationFrame(this.tick)
    } else {
      this.rafId = null
    }
  }

  private cancelRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
