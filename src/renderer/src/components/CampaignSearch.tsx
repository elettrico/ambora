import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  CAMPAIGN_SEARCH_RESULT_KINDS,
  MIN_SEARCH_QUERY_LENGTH,
  searchCampaign,
} from '@/lib/campaignSearch'
import type { Campaign } from '@/lib/types'
import { SidebarSection } from './SidebarSection'

interface CampaignSearchProps {
  campaign: Campaign | undefined
  onOpenClimate: (climateId: string) => void
}

export function CampaignSearch({
  campaign,
  onOpenClimate,
}: CampaignSearchProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const results = useMemo(
    () => (campaign ? searchCampaign(campaign, query).slice(0, 40) : []),
    [campaign, query],
  )
  const queryLength = query.trim().length
  const canSearch = queryLength >= MIN_SEARCH_QUERY_LENGTH
  const groupedResults = useMemo(
    () =>
      CAMPAIGN_SEARCH_RESULT_KINDS.map((kind) => ({
        kind,
        results: results.filter((result) => result.kind === kind),
      })).filter((group) => group.results.length > 0),
    [results],
  )

  return (
    <SidebarSection
      title="Search campaign"
      open={open}
      onToggle={() => setOpen((current) => !current)}
      className="border-t border-border-subtle"
      contentClassName="gap-2 px-3 pb-3"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={campaign ? `Search ${campaign.name}` : 'Select a campaign first'}
          disabled={!campaign}
          className="h-9 pr-8 pl-9 text-[13px]"
          aria-label="Search active campaign"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-text-tertiary hover:bg-surface-3 hover:text-text-primary"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {queryLength > 0 && !canSearch && (
        <p className="px-2 py-3 text-center text-[12px] text-text-tertiary">
          Type at least {MIN_SEARCH_QUERY_LENGTH} characters to search.
        </p>
      )}

      {canSearch && results.length === 0 && (
        <p className="px-2 py-3 text-center text-[12px] text-text-tertiary">
          No matches in this campaign.
        </p>
      )}

      {results.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-md border border-border-subtle bg-surface-2 py-1">
          {groupedResults.map((group) => (
            <div key={group.kind} className="py-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
                {group.kind}
              </p>
              {group.results.map((result) => {
                const content = (
                  <>
                    <span className="truncate text-[13px] text-text-primary">{result.title}</span>
                    {result.detail && (
                      <span className="col-span-2 truncate text-[11px] text-text-secondary">
                        {result.detail}
                      </span>
                    )}
                  </>
                )

                return result.climateId ? (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => onOpenClimate(result.climateId!)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 px-3 py-2 text-left transition-colors hover:bg-surface-3"
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    key={result.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 px-3 py-2"
                  >
                    {content}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </SidebarSection>
  )
}
