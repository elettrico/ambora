import { create } from 'zustand'
import type { Campaign, Climate, Track } from '@/lib/types'
import { DEFAULTS, CLIMATE_COLORS, CLIMATE_ICONS } from '@/lib/constants'

interface CampaignStore {
  campaigns: Campaign[]
  activeCampaignId: string | null
  isLoaded: boolean

  // Init
  loadCampaigns: () => Promise<void>

  // Campaign CRUD
  createCampaign: (name: string, description?: string) => Campaign
  updateCampaign: (id: string, updates: Partial<Pick<Campaign, 'name' | 'description'>>) => void
  deleteCampaign: (id: string) => void
  setActiveCampaign: (id: string | null) => void

  // Climate CRUD
  createClimate: (campaignId: string, name: string) => Climate | null
  updateClimate: (
    campaignId: string,
    climateId: string,
    updates: Partial<Pick<Climate, 'name' | 'color' | 'icon' | 'crossfadeDuration'>>,
  ) => void
  deleteClimate: (campaignId: string, climateId: string) => void
  reorderClimates: (campaignId: string, climateIds: string[]) => void

  // Track CRUD
  addTrack: (campaignId: string, climateId: string, track: Omit<Track, 'id' | 'order'>) => void
  removeTrack: (campaignId: string, climateId: string, trackId: string) => void
  reorderTracks: (campaignId: string, climateId: string, trackIds: string[]) => void

  // Helpers
  getActiveCampaign: () => Campaign | undefined
  getCampaign: (id: string) => Campaign | undefined
}

function persist(campaigns: Campaign[]): void {
  window.api.saveCampaigns(campaigns)
}

function now(): string {
  return new Date().toISOString()
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaigns: [],
  activeCampaignId: null,
  isLoaded: false,

  loadCampaigns: async () => {
    const campaigns = await window.api.getCampaigns()
    set({ campaigns, isLoaded: true })
  },

  createCampaign: (name, description) => {
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      name,
      description,
      climates: [],
      createdAt: now(),
      updatedAt: now(),
    }
    const campaigns = [...get().campaigns, campaign]
    set({ campaigns })
    persist(campaigns)
    return campaign
  },

  updateCampaign: (id, updates) => {
    const campaigns = get().campaigns.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: now() } : c,
    )
    set({ campaigns })
    persist(campaigns)
  },

  deleteCampaign: (id) => {
    const campaigns = get().campaigns.filter((c) => c.id !== id)
    const activeCampaignId = get().activeCampaignId === id ? null : get().activeCampaignId
    set({ campaigns, activeCampaignId })
    persist(campaigns)
  },

  setActiveCampaign: (id) => {
    set({ activeCampaignId: id })
  },

  createClimate: (campaignId, name) => {
    const campaign = get().campaigns.find((c) => c.id === campaignId)
    if (!campaign || campaign.climates.length >= DEFAULTS.maxClimates) {
      return null
    }

    const usedColors = new Set(campaign.climates.map((cl) => cl.color))
    const availableColor =
      CLIMATE_COLORS.find((c) => !usedColors.has(c.hex))?.hex ?? CLIMATE_COLORS[0].hex

    const usedIcons = new Set(campaign.climates.map((cl) => cl.icon))
    const availableIcon = CLIMATE_ICONS.find((i) => !usedIcons.has(i)) ?? CLIMATE_ICONS[0]

    const climate: Climate = {
      id: crypto.randomUUID(),
      name,
      color: availableColor,
      icon: availableIcon,
      tracks: [],
      order: campaign.climates.length,
      crossfadeDuration: DEFAULTS.crossfadeDuration,
    }

    const campaigns = get().campaigns.map((c) =>
      c.id === campaignId ? { ...c, climates: [...c.climates, climate], updatedAt: now() } : c,
    )
    set({ campaigns })
    persist(campaigns)
    return climate
  },

  updateClimate: (campaignId, climateId, updates) => {
    const campaigns = get().campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            climates: c.climates.map((cl) => (cl.id === climateId ? { ...cl, ...updates } : cl)),
            updatedAt: now(),
          }
        : c,
    )
    set({ campaigns })
    persist(campaigns)
  },

  deleteClimate: (campaignId, climateId) => {
    const campaigns = get().campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            climates: c.climates
              .filter((cl) => cl.id !== climateId)
              .map((cl, i) => ({ ...cl, order: i })),
            updatedAt: now(),
          }
        : c,
    )
    set({ campaigns })
    persist(campaigns)
  },

  reorderClimates: (campaignId, climateIds) => {
    const campaigns = get().campaigns.map((c) => {
      if (c.id !== campaignId) return c
      const climateMap = new Map(c.climates.map((cl) => [cl.id, cl]))
      const reordered = climateIds
        .map((id, i) => {
          const cl = climateMap.get(id)
          return cl ? { ...cl, order: i } : null
        })
        .filter((cl): cl is Climate => cl !== null)
      return { ...c, climates: reordered, updatedAt: now() }
    })
    set({ campaigns })
    persist(campaigns)
  },

  addTrack: (campaignId, climateId, track) => {
    const newTrack: Track = {
      ...track,
      id: crypto.randomUUID(),
      order: 0, // will be set below
    }

    const campaigns = get().campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            climates: c.climates.map((cl) => {
              if (cl.id !== climateId) return cl
              const withTrack = { ...newTrack, order: cl.tracks.length }
              return { ...cl, tracks: [...cl.tracks, withTrack] }
            }),
            updatedAt: now(),
          }
        : c,
    )
    set({ campaigns })
    persist(campaigns)
  },

  removeTrack: (campaignId, climateId, trackId) => {
    const campaigns = get().campaigns.map((c) =>
      c.id === campaignId
        ? {
            ...c,
            climates: c.climates.map((cl) =>
              cl.id === climateId
                ? {
                    ...cl,
                    tracks: cl.tracks
                      .filter((t) => t.id !== trackId)
                      .map((t, i) => ({ ...t, order: i })),
                  }
                : cl,
            ),
            updatedAt: now(),
          }
        : c,
    )
    set({ campaigns })
    persist(campaigns)
  },

  reorderTracks: (campaignId, climateId, trackIds) => {
    const campaigns = get().campaigns.map((c) => {
      if (c.id !== campaignId) return c
      return {
        ...c,
        climates: c.climates.map((cl) => {
          if (cl.id !== climateId) return cl
          const trackMap = new Map(cl.tracks.map((t) => [t.id, t]))
          const reordered = trackIds
            .map((id, i) => {
              const t = trackMap.get(id)
              return t ? { ...t, order: i } : null
            })
            .filter((t): t is Track => t !== null)
          return { ...cl, tracks: reordered }
        }),
        updatedAt: now(),
      }
    })
    set({ campaigns })
    persist(campaigns)
  },

  getActiveCampaign: () => {
    const { campaigns, activeCampaignId } = get()
    return campaigns.find((c) => c.id === activeCampaignId)
  },

  getCampaign: (id) => {
    return get().campaigns.find((c) => c.id === id)
  },
}))
