/**
 * Audio normalization chain: GainNode (LUFS correction) → DynamicsCompressorNode (peak taming).
 *
 * Inserted between a local audio source and the channel's crossfade GainNode.
 */

const COMPRESSOR_THRESHOLD = -24 // dB
const COMPRESSOR_KNEE = 30 // dB
const COMPRESSOR_RATIO = 3 // 3:1
const COMPRESSOR_ATTACK = 0.003 // 3ms
const COMPRESSOR_RELEASE = 0.25 // 250ms

export class NormalizationChain {
  private normGain: GainNode
  private compressor: DynamicsCompressorNode
  private analyser: AnalyserNode

  constructor(audioContext: AudioContext) {
    this.normGain = audioContext.createGain()
    this.normGain.gain.value = 1.0

    this.compressor = audioContext.createDynamicsCompressor()
    this.compressor.threshold.value = COMPRESSOR_THRESHOLD
    this.compressor.knee.value = COMPRESSOR_KNEE
    this.compressor.ratio.value = COMPRESSOR_RATIO
    this.compressor.attack.value = COMPRESSOR_ATTACK
    this.compressor.release.value = COMPRESSOR_RELEASE

    this.analyser = audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8

    this.normGain.connect(this.compressor)
    this.compressor.connect(this.analyser)
  }

  get input(): AudioNode {
    return this.normGain
  }

  get output(): AudioNode {
    return this.analyser
  }

  getAnalyser(): AnalyserNode {
    return this.analyser
  }

  getNormalizationGainValue(): number {
    return this.normGain.gain.value
  }

  getCompressorReduction(): number {
    return this.compressor.reduction
  }

  setNormalizationGain(linearGain: number, rampDuration = 0.05): void {
    const now = this.normGain.context.currentTime
    this.normGain.gain.cancelScheduledValues(now)
    this.normGain.gain.setValueAtTime(this.normGain.gain.value, now)
    if (rampDuration > 0) {
      this.normGain.gain.linearRampToValueAtTime(linearGain, now + rampDuration)
    } else {
      this.normGain.gain.setValueAtTime(linearGain, now)
    }
  }

  dispose(): void {
    this.normGain.disconnect()
    this.compressor.disconnect()
    this.analyser.disconnect()
  }
}
