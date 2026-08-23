// Core domain entities for the preference-ranking engine.
//
// This module is deliberately free of any dependency on React, IndexedDB/Dexie,
// or the UI. Everything here is plain data so the ranking engine, persistence
// layer and UI can each depend on these types without depending on each other.

export type Id = string
export type IsoDate = string

/** A ranking project, e.g. "Muse" or "Christopher Nolan Films". */
export interface Collection {
  id: Id
  name: string
  description?: string
  createdDate: IsoDate
  updatedDate: IsoDate
}

/** An optional logical grouping of items within a collection, e.g. an album. */
export interface Group {
  id: Id
  collectionId: Id
  name: string
  metadata?: Record<string, unknown>
}

/** A single thing being ranked, e.g. a song. */
export interface Item {
  id: Id
  collectionId: Id
  groupId?: Id
  name: string
  metadata?: Record<string, unknown>
}

/** The inferred ranking state for one item. */
export interface Rating {
  itemId: Id
  score: number
  confidence: number
  wins: number
  losses: number
  comparisonCount: number
  lastUpdated: IsoDate
}

/** A single recorded "which do you prefer?" decision. */
export interface Comparison {
  id: Id
  collectionId: Id
  itemAId: Id
  itemBId: Id
  winnerId: Id
  timestamp: IsoDate
}

export type RankingAlgorithm = 'elo' | 'bradley-terry'
export type AggregationMethod = 'mean' | 'median' | 'top-n'

/** Relative weights for the pair-selection strategies. Need not sum to 1. */
export interface PairSelectionWeights {
  similarRating: number
  lowConfidence: number
  random: number
  verification: number
}

/** Per-collection configuration. */
export interface CollectionSettings {
  collectionId: Id
  rankingAlgorithm: RankingAlgorithm
  aggregationMethod: AggregationMethod
  /** Number of top items to consider when aggregationMethod is 'top-n'. */
  aggregationTopN: number
  pairSelectionWeights: PairSelectionWeights
  eloKFactor: number
}

export const DEFAULT_SETTINGS: Omit<CollectionSettings, 'collectionId'> = {
  rankingAlgorithm: 'elo',
  aggregationMethod: 'mean',
  aggregationTopN: 3,
  pairSelectionWeights: {
    similarRating: 0.4,
    lowConfidence: 0.3,
    random: 0.2,
    verification: 0.1,
  },
  eloKFactor: 32,
}
