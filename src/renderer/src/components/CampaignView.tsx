import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClimateGrid } from '@/components/ClimateGrid'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useCampaignStore } from '@/store/campaignStore'
import type { Campaign } from '@/lib/types'

interface CampaignViewProps {
  campaign: Campaign
}

export function CampaignView({ campaign }: CampaignViewProps): React.JSX.Element {
  const { updateCampaign } = useCampaignStore()

  const {
    isEditing: nameIsEditing,
    editValue: nameEditValue,
    setEditValue: setNameEditValue,
    startEditing: startNameEditing,
    handleSave: handleNameSave,
    handleKeyDown: handleNameKeyDown,
    inputProps: nameInputProps,
  } = useInlineEdit({
    value: campaign.name,
    onSave: (name) => updateCampaign(campaign.id, { name }),
  })

  const {
    isEditing: descIsEditing,
    editValue: descEditValue,
    setEditValue: setDescEditValue,
    startEditing: startDescEditing,
    handleSave: handleDescSave,
    handleKeyDown: handleDescKeyDown,
    inputProps: descInputProps,
  } = useInlineEdit({
    value: campaign.description ?? '',
    onSave: (description) => updateCampaign(campaign.id, { description: description || undefined }),
  })

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            {nameIsEditing ? (
              <Input
                {...nameInputProps}
                value={nameEditValue}
                onChange={(e) => setNameEditValue(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className="h-9 text-[22px] font-semibold tracking-[-0.02em]"
              />
            ) : (
              <>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-text-primary">
                  {campaign.name}
                </h1>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-text-tertiary hover:text-text-secondary"
                  onClick={startNameEditing}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </>
            )}
          </div>
          {descIsEditing ? (
            <Input
              {...descInputProps}
              value={descEditValue}
              onChange={(e) => setDescEditValue(e.target.value)}
              onBlur={handleDescSave}
              onKeyDown={handleDescKeyDown}
              placeholder="Add a description..."
              className="h-7 text-[13px]"
            />
          ) : (
            <p
              className="cursor-pointer text-[13px] text-text-secondary hover:text-text-primary"
              onClick={startDescEditing}
            >
              {campaign.description || 'Add a description...'}
            </p>
          )}
        </div>
      </div>

      <div className="px-8 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
          Climates
        </p>
      </div>

      <ClimateGrid campaign={campaign} />
    </div>
  )
}
