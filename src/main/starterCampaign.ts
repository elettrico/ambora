import { randomUUID } from 'node:crypto'
import type { Campaign, Climate, Track } from '../shared/types'

interface MoodDefinition {
  name: string
  color: string
  icon: string
  tracks: { title: string; youtubeVideoId: string }[]
}

// All video IDs verified embeddable via YouTube oEmbed API.
// No duplicate video IDs across moods.
const MOODS: MoodDefinition[] = [
  {
    name: 'Tavern',
    color: '#D4943A',
    icon: 'Beer',
    tracks: [
      { title: 'Medieval Tavern Inn Ambience', youtubeVideoId: 'rv3Nl-Od9YU' },
      { title: 'Crowded Local Tavern', youtubeVideoId: 'EULoybB2Nsw' },
      { title: 'The Green Dragon Inn', youtubeVideoId: 'JvV4q5etWFs' },
      { title: 'Medieval Fantasy Tavern', youtubeVideoId: 'vyg5jJrZ42s' },
      { title: 'Snow Tavern', youtubeVideoId: 'VeWrUoNB8DA' },
    ],
  },
  {
    name: 'Battle',
    color: '#DC3545',
    icon: 'Swords',
    tracks: [
      { title: 'D&D Combat Music Mix', youtubeVideoId: 't3B802PIuB0' },
      { title: 'Battle Arena', youtubeVideoId: '3YO67uD8TAo' },
      { title: 'Full Scale War', youtubeVideoId: '0rl7AatkjfA' },
      { title: 'Faith and Steel', youtubeVideoId: 'ldXK_cNpqLQ' },
      { title: 'Surprise Attack', youtubeVideoId: 'sd1Otp7s1Fk' },
    ],
  },
  {
    name: 'Forest',
    color: '#2D9A5D',
    icon: 'TreePine',
    tracks: [
      { title: 'Woodland Ambience and Bird Song', youtubeVideoId: 'xNN7iTA57jM' },
      { title: 'Forest Creek Sounds', youtubeVideoId: 'lR4GNWcwAI8' },
      { title: 'Haunted Forest Sounds', youtubeVideoId: '58dAcjgtfbk' },
      { title: 'Elven Woods', youtubeVideoId: 'xHP2GgxYddY' },
      { title: 'Forest Daytime', youtubeVideoId: '6Em9tLXbhfo' },
    ],
  },
  {
    name: 'Dungeon',
    color: '#404850',
    icon: 'DoorOpen',
    tracks: [
      { title: 'Obscura - Dark Ambient Fantasy', youtubeVideoId: 'a0Av2XNPd_g' },
      { title: 'Wave Echo Cave', youtubeVideoId: 'Z-pbILkmhMk' },
      { title: 'Haunted Dungeon Ambience', youtubeVideoId: 'SsB6MqAQS3o' },
      { title: 'Dark Gothic Abandoned Castles', youtubeVideoId: 'MwToTZc9qOk' },
      { title: 'Dark Tomb Cave Sounds', youtubeVideoId: 'kxqJuc1HHbg' },
    ],
  },
  {
    name: 'Town',
    color: '#CFAD3B',
    icon: 'Castle',
    tracks: [
      { title: 'Fantasy Medieval Town', youtubeVideoId: 'ugLwYV1GSvo' },
      { title: 'Town Square Daytime', youtubeVideoId: 'NeOg8iCFfTA' },
      { title: 'Snow Village', youtubeVideoId: 'Purjkatwxeg' },
      { title: 'Parnast Village', youtubeVideoId: 'zWgYfyNKTgo' },
      { title: "Nobles' Garden", youtubeVideoId: 'Ci0XbtlNMys' },
    ],
  },
  {
    name: 'Storm',
    color: '#4B6BD4',
    icon: 'CloudLightning',
    tracks: [
      { title: 'Rain and Thunderstorm with Fireplace', youtubeVideoId: '3sL0omwElxw' },
      { title: 'Thunderstorm at Sea', youtubeVideoId: 'yh7YvFJyums' },
      { title: 'Heavy Rain on Castle', youtubeVideoId: 'dMGnCkayD6M' },
      { title: 'Cozy Hut Storm', youtubeVideoId: '86d0jE3B6MI' },
      { title: 'Royal Library Thunderstorm', youtubeVideoId: 'CHFif_y2TyM' },
    ],
  },
  {
    name: 'Mystery',
    color: '#6659D9',
    icon: 'Eye',
    tracks: [
      { title: 'Suspense', youtubeVideoId: 'EApZmmYg_oQ' },
      { title: 'Investigation Music', youtubeVideoId: 'sGQFWM19DEw' },
      { title: 'Dark and Mysterious Ambient', youtubeVideoId: 'CDWtH8eHeEU' },
      { title: 'Unveiling Secrets', youtubeVideoId: 'l-vpJVMWUvk' },
      { title: 'Tendrils of Doubt', youtubeVideoId: 'QfsiOUsZSLg' },
    ],
  },
  {
    name: 'Camp',
    color: '#E8652B',
    icon: 'Tent',
    tracks: [
      { title: 'Night Camp in Woods', youtubeVideoId: '7KFoj-SOfHs' },
      { title: 'Campfire in Woods', youtubeVideoId: 'imxILmKjjCQ' },
      { title: 'Resting by Campfire', youtubeVideoId: 'c43mpm0yXK8' },
      { title: 'Simple Cave Campfire', youtubeVideoId: 'rvrmMwJd4Kc' },
      { title: 'Calm Fantasy Medieval Night', youtubeVideoId: 'u3TnmAB693M' },
    ],
  },
  {
    name: 'Ocean',
    color: '#21917F',
    icon: 'Waves',
    tracks: [
      { title: "Pirate Ship Captain's Cabin", youtubeVideoId: 'Ft-lJyu_nuY' },
      { title: 'Sailing Ship High Seas', youtubeVideoId: 'beOw8MEojQ4' },
      { title: 'Ship Ambience', youtubeVideoId: 'uPAfgWAb6Qo' },
      { title: 'Harbor Seaside Market', youtubeVideoId: 'frEJTGfLOhM' },
      { title: 'Ship Cabin', youtubeVideoId: 'D4juEBifIMk' },
    ],
  },
  {
    name: 'Throne Room',
    color: '#8B49B8',
    icon: 'Crown',
    tracks: [
      { title: 'Royal Court Ambience', youtubeVideoId: 'S06F5X2QpNA' },
      { title: "The Queen's Court", youtubeVideoId: 'zLm_xtyqfgg' },
      { title: 'Powerful Royal House', youtubeVideoId: 'jLK_uxLlvm4' },
      { title: 'Medieval Castle Throne Room', youtubeVideoId: '5hB97GjShHE' },
      { title: 'Palace Corridors', youtubeVideoId: 'BwV1azM1Ifw' },
    ],
  },
  {
    name: 'Horror',
    color: '#9B2335',
    icon: 'Skull',
    tracks: [
      { title: 'Dark Ambient Folk Horror', youtubeVideoId: '9tkdYWIeRlo' },
      { title: 'Dungeon of the Dark Pyramid', youtubeVideoId: 'W2NAblVD70Q' },
      { title: 'Night of the Dead', youtubeVideoId: 'tmlZeYnfw7g' },
      { title: 'God of the Void - Lovecraftian', youtubeVideoId: '3QpnZlciJvM' },
      { title: 'Waking Nightmare', youtubeVideoId: 'UJHOgfF-8oc' },
    ],
  },
  {
    name: 'Desert',
    color: '#9B6842',
    icon: 'Sun',
    tracks: [
      { title: 'Arabian Nights', youtubeVideoId: '_38NQhaqs6g' },
      { title: 'Desert Ruins', youtubeVideoId: '46w8MRZKj64' },
      { title: 'Dark Desert Music', youtubeVideoId: 'Vo7n4j3OrNs' },
      { title: 'Windy Desert Ambience', youtubeVideoId: '4E-_Xpj0Mgo' },
      { title: 'Ubar - Ancient Arabian Fantasy', youtubeVideoId: 'na2EwchjVdg' },
    ],
  },
  {
    name: 'Celebration',
    color: '#C74B7A',
    icon: 'Sparkles',
    tracks: [
      { title: 'Festival Town', youtubeVideoId: '8u9ZC8WLIiU' },
      { title: 'Harvest Festival', youtubeVideoId: 'dB2omtw-PUc' },
      { title: 'Village Feast', youtubeVideoId: 'JL3DTrP_tUI' },
      { title: 'Royal Banquet', youtubeVideoId: 'v5VYRKkNtzs' },
      { title: 'Gala Night', youtubeVideoId: 'ulplqXTp4R0' },
    ],
  },
  {
    name: 'Emotional',
    color: '#A8B0B8',
    icon: 'Heart',
    tracks: [
      { title: 'Last Goodbye', youtubeVideoId: 'mFsQpCjRyvY' },
      { title: 'Melancholic Journey', youtubeVideoId: '3nsyBktjdYs' },
      { title: 'Farewell', youtubeVideoId: 'ofRMvTxQCHI' },
      { title: 'Emotional Music Mix', youtubeVideoId: 'N-3bhcOVTzM' },
      { title: 'A Promise', youtubeVideoId: 'sRAXOqNB-UI' },
    ],
  },
  {
    name: 'Adventure Begins',
    color: '#3B8DD4',
    icon: 'Mountain',
    tracks: [
      { title: 'The Adventure Begins', youtubeVideoId: 'Jikm8CCRbdM' },
      { title: 'A New Adventure', youtubeVideoId: 'vdTD0BIKsMQ' },
      { title: 'The Journey Begins', youtubeVideoId: 'fIH24cYfQCw' },
      { title: 'A New Dawn', youtubeVideoId: 'FT4QX_9NhAY' },
      { title: 'Wildlands Wanderings', youtubeVideoId: 'RQJiDxIiWAc' },
    ],
  },
]

function createTrack(def: { title: string; youtubeVideoId: string }, order: number): Track {
  return {
    id: randomUUID(),
    title: def.title,
    source: 'youtube',
    youtubeVideoId: def.youtubeVideoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${def.youtubeVideoId}`,
    order,
  }
}

function createClimate(mood: MoodDefinition, order: number): Climate {
  return {
    id: randomUUID(),
    name: mood.name,
    color: mood.color,
    icon: mood.icon,
    tracks: mood.tracks.map((t, i) => createTrack(t, i)),
    order,
    crossfadeDuration: 4,
  }
}

export function createStarterCampaign(): Campaign {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    name: 'Starter Campaign',
    description: 'Pre-loaded RPG moods with ambient YouTube tracks. Edit or delete freely.',
    climates: MOODS.map((mood, i) => createClimate(mood, i)),
    createdAt: now,
    updatedAt: now,
  }
}
