import type { Comparison, Id, RankingAlgorithm } from '../domain/types'
import { DEFAULT_ELO_CONFIG, type EloConfig } from './elo'
import { replayComparisons } from './replay'
import { fitBradleyTerry } from './bradleyTerry'

// A common interface over the ranking algorithms. Both Elo (online, via replay)
// and Bradley-Terry (batch fit) are pure functions of the comparison log, so
// they share one shape: given items + the log, produce a scored result per item.
// New algorithms (TrueSkill, Glicko) just implement RankingModel and register in
// MODELS — the UI selects a model without knowing the maths behind it.

/** Fixed seed date for replay; timestamps don't affect scores. */
const SEED_DATE = '2026-08-23T00:00:00.000Z'

export interface ModelResult {
  itemId: Id
  score: number
  comparisonCount: number
  /** Count-based confidence proxy (Elo). */
  confidence?: number
  /** 95% half-interval on the score scale (Bradley-Terry). */
  interval95?: number
  wins?: number
  losses?: number
}

export interface RankingModel {
  readonly id: RankingAlgorithm
  readonly name: string
  /** Whether this model produces real confidence intervals. */
  readonly providesIntervals: boolean
  rank(
    itemIds: readonly Id[],
    comparisons: readonly Comparison[],
    config?: EloConfig,
  ): ModelResult[]
}

export const eloModel: RankingModel = {
  id: 'elo',
  name: 'Elo',
  providesIntervals: false,
  rank(itemIds, comparisons, config = DEFAULT_ELO_CONFIG) {
    const ratings = replayComparisons(itemIds, comparisons, SEED_DATE, config)
    return [...ratings.values()].map((r) => ({
      itemId: r.itemId,
      score: r.score,
      comparisonCount: r.comparisonCount,
      confidence: r.confidence,
      wins: r.wins,
      losses: r.losses,
    }))
  },
}

export const bradleyTerryModel: RankingModel = {
  id: 'bradley-terry',
  name: 'Bradley–Terry',
  providesIntervals: true,
  rank(itemIds, comparisons) {
    const fit = fitBradleyTerry(itemIds, comparisons)
    return fit.results.map((r) => ({
      itemId: r.itemId,
      score: r.score,
      comparisonCount: r.comparisonCount,
      interval95: r.interval95,
    }))
  },
}

export const MODELS: Record<RankingAlgorithm, RankingModel> = {
  elo: eloModel,
  'bradley-terry': bradleyTerryModel,
}

export function getModel(id: RankingAlgorithm): RankingModel {
  return MODELS[id]
}
