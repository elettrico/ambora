import { SkipForward, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useAudioStore } from '@/store/audioStore'
import { useCampaignStore } from '@/store/campaignStore'

export function NowPlayingBar(): React.JSX.Element {
  const { volume, setVolume, activeClimateId, activeTrackId } = useAudioStore()
  const { campaigns } = useCampaignStore()

  let climateName: string | null = null
  let climateColor: string | null = null
  let trackTitle: string | null = null

  if (activeClimateId) {
    for (const campaign of campaigns) {
      const climate = campaign.climates.find((c) => c.id === activeClimateId)
      if (climate) {
        climateName = climate.name
        climateColor = climate.color
        if (activeTrackId) {
          const track = climate.tracks.find((t) => t.id === activeTrackId)
          if (track) trackTitle = track.title
        }
        break
      }
    }
  }

  const isIdle = !climateName

  return (
    <div className="flex h-16 shrink-0 items-center border-t border-border-subtle bg-surface-1 px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {climateColor && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: climateColor }}
          />
        )}
        {isIdle ? (
          <span className="text-[13px] text-text-tertiary">No track playing</span>
        ) : (
          <>
            <span className="shrink-0 text-[13px] font-medium text-text-primary">
              {climateName}
            </span>
            {trackTitle && (
              <>
                <span className="text-[13px] text-text-tertiary">&middot;</span>
                <span className="min-w-0 truncate text-[13px] text-text-secondary">
                  {trackTitle}
                </span>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" disabled={isIdle}>
          <SkipForward className="size-[18px]" />
        </Button>
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 text-text-secondary" />
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={1}
            onValueChange={([val]) => setVolume(val)}
            className="w-[120px]"
          />
        </div>
      </div>
    </div>
  )
}
