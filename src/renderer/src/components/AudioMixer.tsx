import { useRef, useState } from 'react'
import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { DEFAULTS } from '@/lib/constants'
import { useAudioStore } from '@/store/audioStore'
import { SidebarSection } from './SidebarSection'

interface MixerRowProps {
  label: string
  value: number
  onChange: (value: number) => void
}

function MixerRow({ label, value, onChange }: MixerRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[64px_1fr_34px] items-center gap-2">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={([next]) => onChange(next)}
        aria-label={`${label} volume`}
      />
      <span className="text-right text-[11px] tabular-nums text-text-tertiary">{value}%</span>
    </div>
  )
}

export function AudioMixer(): React.JSX.Element {
  const [open, setOpen] = useState(() => localStorage.getItem('ambora:mixer-open') !== 'false')
  const {
    volume,
    musicVolume,
    ambientVolume,
    sfxVolume,
    setVolume,
    setMusicVolume,
    setAmbientVolume,
    setSfxVolume,
  } = useAudioStore()
  const previousMaster = useRef<number>(DEFAULTS.volume)
  const VolumeIcon = volume === 0 ? VolumeX : volume <= 50 ? Volume1 : Volume2

  function toggle(): void {
    setOpen((current) => {
      localStorage.setItem('ambora:mixer-open', String(!current))
      return !current
    })
  }

  function toggleMasterMute(): void {
    if (volume > 0) {
      previousMaster.current = volume
      setVolume(0)
    } else {
      setVolume(previousMaster.current || DEFAULTS.volume)
    }
  }

  return (
    <SidebarSection
      title="Mixer"
      open={open}
      onToggle={toggle}
      className="border-t border-border-subtle"
      contentClassName="gap-3 px-5 pb-4"
    >
      <div className="grid grid-cols-[64px_1fr_34px] items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleMasterMute}
            aria-label="Mute master"
          >
            <VolumeIcon className="size-3.5 text-text-secondary" />
          </Button>
          <span className="text-[12px] text-text-primary">Master</span>
        </div>
        <Slider
          value={[volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={([next]) => setVolume(next)}
          aria-label="Master volume"
        />
        <span className="text-right text-[11px] tabular-nums text-text-tertiary">{volume}%</span>
      </div>
      <MixerRow label="Music" value={musicVolume} onChange={setMusicVolume} />
      <MixerRow label="Ambient" value={ambientVolume} onChange={setAmbientVolume} />
      <MixerRow label="SFX" value={sfxVolume} onChange={setSfxVolume} />
    </SidebarSection>
  )
}
