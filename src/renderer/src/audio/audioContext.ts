/**
 * Single shared AudioContext for the renderer.
 *
 * The music engine (dual-channel crossfade) and the ambient engine both graph
 * into it. Sharing one context — rather than each owning its own — keeps a
 * single output stream to the device and lets ambient layers and music be
 * scheduled against the same clock.
 *
 * Ownership lives here instead of in AudioEngine so AmbientEngine doesn't have
 * to import AudioEngine (which imports it back).
 */

let ctx: AudioContext | null = null
let output: GainNode | null = null
let musicOutput: GainNode | null = null
let ambientOutput: GainNode | null = null
let musicMeter: AnalyserNode | null = null
let ambientMeter: AnalyserNode | null = null
let leftMeter: AnalyserNode | null = null
let rightMeter: AnalyserNode | null = null

export function getAudioContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/** Shared final output bus. All audio routes through here before the device. */
export function getAudioOutputNode(): AudioNode {
  const audioContext = getAudioContext()
  if (output) return output

  output = audioContext.createGain()
  output.connect(audioContext.destination)

  // The app can still play in lightweight test contexts that omit analyser
  // support; only the meters are unavailable there.
  if (
    typeof audioContext.createChannelSplitter === 'function' &&
    typeof audioContext.createAnalyser === 'function'
  ) {
    const splitter = audioContext.createChannelSplitter(2)
    leftMeter = audioContext.createAnalyser()
    rightMeter = audioContext.createAnalyser()
    leftMeter.fftSize = 256
    rightMeter.fftSize = 256
    leftMeter.smoothingTimeConstant = 0.75
    rightMeter.smoothingTimeConstant = 0.75
    output.connect(splitter)
    splitter.connect(leftMeter, 0)
    splitter.connect(rightMeter, 1)
  }

  return output
}

function createDuckedOutput(kind: 'music' | 'ambient'): GainNode {
  const audioContext = getAudioContext()
  const bus = audioContext.createGain()
  bus.gain.value = 1
  bus.connect(getAudioOutputNode())
  if (typeof audioContext.createAnalyser === 'function') {
    const meter = audioContext.createAnalyser()
    meter.fftSize = 256
    meter.smoothingTimeConstant = 0.75
    bus.connect(meter)
    if (kind === 'music') musicMeter = meter
    else ambientMeter = meter
  }
  return bus
}

/** Music's post-mixer output, with independent soundboard ducking. */
export function getMusicOutputNode(): GainNode {
  if (!musicOutput) musicOutput = createDuckedOutput('music')
  return musicOutput
}

/** Ambient's post-mixer output, with independent soundboard ducking. */
export function getAmbientOutputNode(): GainNode {
  if (!ambientOutput) ambientOutput = createDuckedOutput('ambient')
  return ambientOutput
}

function rampGain(bus: GainNode, target: number, now: number, duration: number): void {
  bus.gain.cancelScheduledValues(now)
  bus.gain.setValueAtTime(bus.gain.value, now)
  if (duration === 0) bus.gain.setValueAtTime(target, now)
  else bus.gain.linearRampToValueAtTime(target, now + duration)
}

/** Smoothly set each background channel's multiplier. A value of 1 restores it. */
export function setBackgroundDuck(musicLevel: number, ambientLevel: number, fadeSec: number): void {
  const audioContext = getAudioContext()
  const now = audioContext.currentTime
  const duration = Math.max(0, fadeSec)
  rampGain(getMusicOutputNode(), Math.max(0, Math.min(1, musicLevel)), now, duration)
  rampGain(getAmbientOutputNode(), Math.max(0, Math.min(1, ambientLevel)), now, duration)
}

export function getBackgroundMeterAnalysers(): {
  music: AnalyserNode | null
  ambient: AnalyserNode | null
} {
  return { music: musicMeter, ambient: ambientMeter }
}

export function getOutputMeterAnalysers(): {
  left: AnalyserNode | null
  right: AnalyserNode | null
} {
  return { left: leftMeter, right: rightMeter }
}

/** The current context without creating one — for teardown paths. */
export function peekAudioContext(): AudioContext | null {
  return ctx
}

export function closeAudioContext(): void {
  musicOutput?.disconnect()
  ambientOutput?.disconnect()
  musicMeter?.disconnect()
  ambientMeter?.disconnect()
  output?.disconnect()
  leftMeter?.disconnect()
  rightMeter?.disconnect()
  output = null
  musicOutput = null
  ambientOutput = null
  musicMeter = null
  ambientMeter = null
  leftMeter = null
  rightMeter = null
  void ctx?.close()
  ctx = null
}
