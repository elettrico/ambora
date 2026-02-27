import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ClimateCard } from '@/components/ClimateCard'
import { ClimateDetail } from '@/components/ClimateDetail'
import { useCampaignStore } from '@/store/campaignStore'
import { DEFAULTS } from '@/lib/constants'
import type { Campaign } from '@/lib/types'
import { toast } from 'sonner'

interface ClimateGridProps {
  campaign: Campaign
}

export function ClimateGrid({ campaign }: ClimateGridProps): React.JSX.Element {
  const { createClimate } = useCampaignStore()
  const [selectedClimateId, setSelectedClimateId] = useState<string | null>(null)

  const sorted = [...campaign.climates].sort((a, b) => a.order - b.order)
  const selectedClimate = sorted.find((c) => c.id === selectedClimateId)
  const canAdd = campaign.climates.length < DEFAULTS.maxClimates

  function handleAddClimate(): void {
    const climate = createClimate(campaign.id, 'New Climate')
    if (climate) {
      setSelectedClimateId(climate.id)
    } else {
      toast.error(`Maximum of ${DEFAULTS.maxClimates} climates reached`)
    }
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 px-8 pb-8">
        {sorted.map((climate) => (
          <ClimateCard
            key={climate.id}
            climate={climate}
            onClick={() => setSelectedClimateId(climate.id)}
          />
        ))}
        {canAdd && (
          <button
            type="button"
            className="flex min-h-[120px] min-w-[200px] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border text-text-tertiary transition-colors duration-150 hover:border-text-tertiary hover:text-text-secondary"
            onClick={handleAddClimate}
          >
            <Plus className="size-6" />
            <span className="text-[13px]">Add Climate</span>
          </button>
        )}
      </div>

      {selectedClimate && (
        <ClimateDetail
          climate={selectedClimate}
          campaignId={campaign.id}
          open={!!selectedClimateId}
          onOpenChange={(open) => {
            if (!open) setSelectedClimateId(null)
          }}
        />
      )}
    </>
  )
}
