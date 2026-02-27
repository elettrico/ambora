type ChannelId = 'A' | 'B'

interface ActiveFade {
  channelId: ChannelId
  gainNode: GainNode
  timeoutId: ReturnType<typeof setTimeout> | null
}

export class CrossfadeManager {
  private activeFades = new Map<ChannelId, ActiveFade>()

  fadeChannel(
    channelId: ChannelId,
    gainNode: GainNode,
    targetVolume: number,
    durationSec: number,
    onComplete?: () => void,
  ): void {
    this.cancelFade(channelId)

    const now = gainNode.context.currentTime
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(targetVolume, now + durationSec)

    const timeoutId = onComplete ? setTimeout(onComplete, durationSec * 1000 + 50) : null

    this.activeFades.set(channelId, { channelId, gainNode, timeoutId })
  }

  crossfade(
    outId: ChannelId,
    outGain: GainNode,
    inId: ChannelId,
    inGain: GainNode,
    targetVolume: number,
    durationSec: number,
    onComplete?: () => void,
  ): void {
    this.fadeChannel(outId, outGain, 0, durationSec)
    this.fadeChannel(inId, inGain, targetVolume, durationSec, onComplete)
  }

  setImmediate(gainNode: GainNode, volume: number): void {
    const now = gainNode.context.currentTime
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(volume, now)
  }

  cancelFade(channelId: ChannelId): void {
    const fade = this.activeFades.get(channelId)
    if (!fade) return

    if (fade.timeoutId !== null) {
      clearTimeout(fade.timeoutId)
    }
    const now = fade.gainNode.context.currentTime
    fade.gainNode.gain.cancelScheduledValues(now)
    fade.gainNode.gain.setValueAtTime(fade.gainNode.gain.value, now)
    this.activeFades.delete(channelId)
  }

  cancelAll(): void {
    this.cancelFade('A')
    this.cancelFade('B')
  }
}
