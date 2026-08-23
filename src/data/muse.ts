import { buildCollection, type GroupedCollectionSeed } from './buildCollection'

// Muse studio discography, source-verified against Wikipedia / MuseWiki /
// Discogs. Standard-edition tracklists in order; the first four albums also
// carry their Japanese-edition bonus track. Edition caveats are recorded in
// comments next to the relevant album.
//
// NOTE: The Wow! Signal (2026) is very recent; its tracklist rests on web
// sources retrieved in Aug 2026 and is worth a human spot-check.

export interface MuseAlbum {
  name: string
  year: number
  tracks: string[]
  /** Official bonus/deluxe tracks (only the first four albums have them). */
  bonusTracks?: string[]
}

export const museAlbums: MuseAlbum[] = [
  {
    name: 'Showbiz',
    year: 1999,
    tracks: [
      'Sunburn',
      'Muscle Museum',
      'Fillip',
      'Falling Down',
      'Cave',
      'Showbiz',
      'Unintended',
      'Uno',
      'Sober',
      'Escape',
      'Overdue',
      "Hate This and I'll Love You",
    ],
    bonusTracks: ['Spiral Static'], // Japanese-edition bonus
  },
  {
    name: 'Origin of Symmetry',
    year: 2001,
    tracks: [
      'New Born',
      'Bliss',
      'Space Dementia',
      'Hyper Music',
      'Plug In Baby',
      'Citizen Erased',
      'Micro Cuts',
      'Screenager',
      'Darkshines',
      'Feeling Good',
      'Megalomania',
    ],
    bonusTracks: ['Futurism'], // Japanese bonus; folded into 2021 RemiXX remaster
  },
  {
    name: 'Absolution',
    year: 2003,
    tracks: [
      'Intro',
      'Apocalypse Please',
      'Time Is Running Out',
      'Sing for Absolution',
      'Stockholm Syndrome',
      'Falling Away with You',
      'Interlude',
      'Hysteria',
      'Blackout',
      'Butterflies and Hurricanes',
      'The Small Print',
      'Endlessly',
      'Thoughts of a Dying Atheist',
      'Ruled by Secrecy',
    ],
    bonusTracks: ['Fury'], // Japanese-edition bonus
  },
  {
    name: 'Black Holes and Revelations',
    year: 2006,
    tracks: [
      'Take a Bow',
      'Starlight',
      'Supermassive Black Hole',
      'Map of the Problematique',
      "Soldier's Poem",
      'Invincible',
      'Assassin',
      'Exo-Politics',
      'City of Delusion',
      'Hoodoo',
      'Knights of Cydonia',
    ],
    bonusTracks: ['Glorious'], // Japanese-edition bonus
  },
  {
    name: 'The Resistance',
    year: 2009,
    tracks: [
      'Uprising',
      'Resistance',
      'Undisclosed Desires',
      'United States of Eurasia (+Collateral Damage)',
      'Guiding Light',
      'Unnatural Selection',
      'MK Ultra',
      "I Belong to You (+Mon Cœur S'ouvre à Ta Voix)",
      'Exogenesis: Symphony Part 1 (Overture)',
      'Exogenesis: Symphony Part 2 (Cross-Pollination)',
      'Exogenesis: Symphony Part 3 (Redemption)',
    ],
  },
  {
    name: 'The 2nd Law',
    year: 2012,
    tracks: [
      'Supremacy',
      'Madness',
      'Panic Station',
      'Prelude',
      'Survival',
      'Follow Me',
      'Animals',
      'Explorers',
      'Big Freeze',
      'Save Me',
      'Liquid State',
      'The 2nd Law: Unsustainable',
      'The 2nd Law: Isolated System',
    ],
  },
  {
    name: 'Drones',
    year: 2015,
    tracks: [
      'Dead Inside',
      '[Drill Sergeant]',
      'Psycho',
      'Mercy',
      'Reapers',
      'The Handler',
      '[JFK]',
      'Defector',
      'Revolt',
      'Aftermath',
      'The Globalist',
      'Drones',
    ],
  },
  {
    name: 'Simulation Theory',
    year: 2018,
    tracks: [
      'Algorithm',
      'The Dark Side',
      'Pressure',
      'Propaganda',
      'Break It to Me',
      'Something Human',
      'Thought Contagion',
      'Get Up and Fight',
      'Blockades',
      'Dig Down',
      'The Void',
    ],
  },
  {
    name: 'Will of the People',
    year: 2022,
    tracks: [
      'Will of the People',
      'Compliance',
      'Liberation',
      "Won't Stand Down",
      'Ghosts (How Can I Move On)',
      "You Make Me Feel Like It's Halloween",
      'Kill or Be Killed',
      'Verona',
      'Euphoria',
      'We Are Fucking Fucked',
    ],
  },
  {
    name: 'The Wow! Signal',
    year: 2026,
    tracks: [
      'The Dark Forest',
      'Nightshift Superstar',
      'Shimmering Scars',
      'Cryogen',
      'Be with You',
      'Hexagons',
      'The Sickness in You & I',
      'Unravelling',
      'Hush', // features Ellie Goulding
      'Space Debris',
    ],
  },
]

function toSeed(albums: MuseAlbum[]): GroupedCollectionSeed {
  return {
    name: 'Muse',
    description: 'Muse studio discography — rank the songs head-to-head.',
    groups: albums.map((album) => ({
      name: album.name,
      metadata: { year: album.year },
      items: [
        ...album.tracks.map((title, i) => ({
          name: title,
          metadata: { year: album.year, trackNumber: i + 1, isBonus: false },
        })),
        ...(album.bonusTracks ?? []).map((title, i) => ({
          name: title,
          metadata: {
            year: album.year,
            trackNumber: album.tracks.length + i + 1,
            isBonus: true,
          },
        })),
      ],
    })),
  }
}

export const museSeed: GroupedCollectionSeed = toSeed(museAlbums)

/** The fully-built Muse collection (collection + album groups + song items). */
export const muse = buildCollection(museSeed)
