import { useEffect, useRef } from 'react'

interface AudioLevelMeterProps {
  analyser: () => AnalyserNode | null
  label: string
}

const WIDTH = 112
const HEIGHT = 6
const SEGMENTS = 16
const SEGMENT_GAP = 2
const METER_FLOOR_DBFS = -48
const CLIP_THRESHOLD = 0.99
const CLIP_HOLD_MS = 750
const WARNING_SEGMENTS = 4

/** A small, read-only peak meter for a live audio bus. */
export function AudioLevelMeter({ analyser, label }: AudioLevelMeterProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const levelRef = useRef(0)
  const clippedUntilRef = useRef(0)
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    function paint(): void {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return
      const node = analyser()
      let peak = 0
      if (node) {
        if (!bufferRef.current || bufferRef.current.length !== node.fftSize) {
          bufferRef.current = new Float32Array(node.fftSize)
        }
        node.getFloatTimeDomainData(bufferRef.current)
        for (const sample of bufferRef.current) {
          peak = Math.max(peak, Math.abs(sample))
        }
      }
      const peakDbfs = peak > 0 ? 20 * Math.log10(peak) : METER_FLOOR_DBFS
      const level = Math.max(0, Math.min(1, (peakDbfs - METER_FLOOR_DBFS) / -METER_FLOOR_DBFS))
      if (peak >= CLIP_THRESHOLD) clippedUntilRef.current = performance.now() + CLIP_HOLD_MS
      const clipping = performance.now() < clippedUntilRef.current
      levelRef.current += (level - levelRef.current) * (level > levelRef.current ? 0.55 : 0.2)
      const styles = getComputedStyle(document.documentElement)
      const accent = styles.getPropertyValue('--color-accent').trim() || '#7B93F5'
      const surface = styles.getPropertyValue('--color-surface-3').trim() || '#25252B'
      const warning = styles.getPropertyValue('--color-danger').trim() || '#F07070'
      const clipAlarm = '#FF3B30'
      const segmentWidth = (WIDTH - (SEGMENTS - 1) * SEGMENT_GAP) / SEGMENTS
      const activeSegments = Math.round(levelRef.current * SEGMENTS)
      context.clearRect(0, 0, WIDTH, HEIGHT)
      for (let index = 0; index < SEGMENTS; index++) {
        const active = index < activeSegments
        const clipSegment = index === SEGMENTS - 1 && clipping
        const warningSegment = index >= SEGMENTS - WARNING_SEGMENTS
        context.fillStyle = clipSegment
          ? clipAlarm
          : active
            ? warningSegment
              ? warning
              : accent
            : surface
        context.beginPath()
        context.roundRect(index * (segmentWidth + SEGMENT_GAP), 0, segmentWidth, HEIGHT, 1)
        context.fill()
      }
      canvas.setAttribute(
        'aria-label',
        clipping ? `${label} live volume; clipping detected` : `${label} live volume`,
      )
      if (!reducedMotion) rafRef.current = requestAnimationFrame(paint)
    }
    rafRef.current = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser, label])

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="h-1.5 w-28"
      aria-label={`${label} live volume`}
      role="img"
    />
  )
}
