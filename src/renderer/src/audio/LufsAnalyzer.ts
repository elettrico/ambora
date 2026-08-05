/**
 * Gain correction from measured integrated LUFS toward YouTube's ~-14 LUFS target.
 *
 * Loudness measurement itself runs in the main process via FFmpeg ebur128
 * (see src/main/lufsAnalyze.ts). This module only converts a measured value into
 * a linear gain for NormalizationChain.
 */

export const TARGET_LUFS = -14
export const MAX_GAIN_DB = 12

export interface LufsResult {
  integratedLufs: number
  gainCorrection: number
}

export function computeGainCorrection(measuredLufs: number): LufsResult {
  if (!Number.isFinite(measuredLufs) || measuredLufs <= -70) {
    // Silence or near-silence — don't amplify
    return { integratedLufs: measuredLufs, gainCorrection: 1.0 }
  }

  const correctionDb = Math.min(TARGET_LUFS - measuredLufs, MAX_GAIN_DB)
  const gainCorrection = Math.pow(10, correctionDb / 20)

  return { integratedLufs: measuredLufs, gainCorrection }
}
