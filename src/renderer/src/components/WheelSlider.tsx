import type { ComponentProps, WheelEvent } from 'react'
import { Slider } from '@/components/ui/slider'

type WheelSliderProps = ComponentProps<typeof Slider>

/** Adds precise mouse-wheel adjustments without changing the shadcn primitive. */
export function WheelSlider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  onWheel,
  ...props
}: WheelSliderProps): React.JSX.Element {
  function handleWheel(event: WheelEvent<HTMLDivElement>): void {
    onWheel?.(event)
    if (event.defaultPrevented || !onValueChange || !Array.isArray(value) || event.deltaY === 0) {
      return
    }

    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    const current = value[0] ?? min
    const next = Math.max(min, Math.min(max, current + direction * step))
    if (next !== current) onValueChange([next])
  }

  return (
    <Slider
      {...props}
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={onValueChange}
      onWheel={handleWheel}
    />
  )
}
