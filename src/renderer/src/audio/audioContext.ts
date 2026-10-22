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
  output?.disconnect()
  leftMeter?.disconnect()
  rightMeter?.disconnect()
  output = null
  leftMeter = null
  rightMeter = null
  void ctx?.close()
  ctx = null
}
