/**
 * Map domain campaigns to the sanitized phone-remote projection.
 *
 * Never include filesystem paths, media tokens, or other machine-local metadata.
 */

import type {
  AmbientLayer,
  Campaign,
  Climate,
  PlaybackState,
  RemoteAmbientLayer,
  RemoteCampaign,
  RemoteClimate,
  RemoteFullState,
  RemoteTrack,
  Track,
} from './types'

function toRemoteTrack(track: Track): RemoteTrack {
  return {
    id: track.id,
    title: track.title,
    order: track.order,
  }
}

function toRemoteAmbientLayer(layer: AmbientLayer): RemoteAmbientLayer {
  return {
    id: layer.id,
    name: layer.name,
    mode: layer.mode,
    enabled: layer.enabled,
    volume: layer.volume,
    order: layer.order,
  }
}

function toRemoteClimate(climate: Climate): RemoteClimate {
  const remote: RemoteClimate = {
    id: climate.id,
    name: climate.name,
    color: climate.color,
    icon: climate.icon,
    order: climate.order,
    tracks: climate.tracks.map(toRemoteTrack),
  }
  if (climate.ambientLayers && climate.ambientLayers.length > 0) {
    remote.ambientLayers = climate.ambientLayers.map(toRemoteAmbientLayer)
  }
  return remote
}

export function toRemoteCampaign(campaign: Campaign): RemoteCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    climates: campaign.climates.map(toRemoteClimate),
  }
}

export function toRemoteCampaigns(campaigns: Campaign[]): RemoteCampaign[] {
  return campaigns.map(toRemoteCampaign)
}

export function toRemoteFullState(state: {
  campaigns: Campaign[]
  activeCampaignId: string | null
  playback: PlaybackState
}): RemoteFullState {
  return {
    campaigns: toRemoteCampaigns(state.campaigns),
    activeCampaignId: state.activeCampaignId,
    playback: state.playback,
  }
}

/** True if a JSON value still looks like it contains absolute local paths. */
export function remotePayloadContainsPaths(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') {
    if (/^\/(?:Users|home|tmp|var|private)\//.test(value)) return true
    if (/^[A-Za-z]:[\\/]/.test(value)) return true
    return false
  }
  if (Array.isArray(value)) {
    return value.some(remotePayloadContainsPaths)
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'localFilePath') return true
      if (remotePayloadContainsPaths(child)) return true
    }
  }
  return false
}
