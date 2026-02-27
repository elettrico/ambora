import { CLIMATE_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  selectedColor: string
  onSelectColor: (color: string) => void
}

export function ColorPicker({ selectedColor, onSelectColor }: ColorPickerProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CLIMATE_COLORS.map((color) => (
        <button
          key={color.hex}
          type="button"
          title={color.name}
          className={cn(
            'size-7 rounded-full transition-transform duration-100 hover:scale-110',
            selectedColor === color.hex && 'ring-2 ring-offset-2 ring-offset-surface-1',
          )}
          style={{
            backgroundColor: color.hex,
            ...(selectedColor === color.hex ? { ringColor: color.hex } : {}),
          }}
          onClick={() => onSelectColor(color.hex)}
        />
      ))}
    </div>
  )
}
