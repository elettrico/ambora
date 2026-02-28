import type { VolumeController } from './VolumeController'

type ChannelId = 'A' | 'B'

interface ActiveFade {
  channelId: ChannelId
  controller: VolumeController
  timeoutId: ReturnType<typeof setTimeout> | null
}

export class CrossfadeManager {
  private activeFades = new Map<ChannelId, ActiveFade>()

  fadeChannel(
    channelId: ChannelId,
    controller: VolumeController,
    targetVolume: number,
    durationSec: number,
    onComplete?: () => void,
  ): void {
    this.cancelFade(channelId)

    controller.rampTo(targetVolume, durationSec)

    const timeoutId = onComplete ? setTimeout(onComplete, durationSec * 1000 + 50) : null

    this.activeFades.set(channelId, { channelId, controller, timeoutId })
  }

  crossfade(
    outId: ChannelId,
    outController: VolumeController,
    inId: ChannelId,
    inController: VolumeController,
    targetVolume: number,
    durationSec: number,
    onComplete?: () => void,
  ): void {
    this.fadeChannel(outId, outController, 0, durationSec)
    this.fadeChannel(inId, inController, targetVolume, durationSec, onComplete)
  }

  setImmediate(controller: VolumeController, volume: number): void {
    controller.setImmediate(volume)
  }

  cancelFade(channelId: ChannelId): void {
    const fade = this.activeFades.get(channelId)
    if (!fade) return

    if (fade.timeoutId !== null) {
      clearTimeout(fade.timeoutId)
    }
    fade.controller.cancelRamp()
    this.activeFades.delete(channelId)
  }

  cancelAll(): void {
    this.cancelFade('A')
    this.cancelFade('B')
  }
}
