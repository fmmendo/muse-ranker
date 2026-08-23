import type { Id, IsoDate, Rating } from '../domain/types'

// Elo ranking engine.
//
// Pure and framework-free: no React, no IndexedDB, no Date.now(). Every function
// is deterministic given its arguments (timestamps are passed in), which keeps
// the engine trivially testable and swappable behind an interface later.
//
// The "online" model: ratings update incrementally after each comparison. This
// drives the live UI and pair selection. A batch Bradley-Terry fit (M7) will
// later provide the definitive ranking with proper confidence intervals.

export interface EloConfig {
  /** How much a single result moves ratings. Higher = more volatile. */
  kFactor: number
  /** Rating assigned to an item before any comparisons. */
  initialRating: number
}

export const DEFAULT_ELO_CONFIG: EloConfig = {
  kFactor: 32,
  initialRating: 1000,
}

/**
 * Smoothing constant for the confidence proxy. Confidence reaches 0.5 after this
 * many comparisons. This is a deliberately simple placeholder — Elo has no
 * native uncertainty; real confidence intervals arrive with Bradley-Terry (M7).
 */
const CONFIDENCE_SMOOTHING = 10

/** Probability that A beats B given their current ratings (the Elo logistic). */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
}

/**
 * New rating after one result.
 * `actual` is 1 for a win, 0 for a loss (0.5 for a draw, unused for now).
 */
export function updateRating(
  rating: number,
  expected: number,
  actual: number,
  kFactor: number,
): number {
  return rating + kFactor * (actual - expected)
}

/**
 * A count-based confidence proxy in [0, 1) that rises as more comparisons are
 * made. Placeholder until Bradley-Terry provides principled uncertainty.
 */
export function confidenceFromCount(comparisonCount: number): number {
  return comparisonCount / (comparisonCount + CONFIDENCE_SMOOTHING)
}

/** A fresh rating for an item that has not yet been compared. */
export function initialRating(
  itemId: Id,
  timestamp: IsoDate,
  config: EloConfig = DEFAULT_ELO_CONFIG,
): Rating {
  return {
    itemId,
    score: config.initialRating,
    confidence: 0,
    wins: 0,
    losses: 0,
    comparisonCount: 0,
    lastUpdated: timestamp,
  }
}

export interface EloOutcome {
  winner: Rating
  loser: Rating
}

/**
 * Apply one comparison result, returning updated ratings for both items.
 * Inputs are not mutated. The rating exchange is zero-sum: the winner gains
 * exactly what the loser drops.
 */
export function recordComparison(
  winner: Rating,
  loser: Rating,
  timestamp: IsoDate,
  config: EloConfig = DEFAULT_ELO_CONFIG,
): EloOutcome {
  const expectedWinner = expectedScore(winner.score, loser.score)
  const expectedLoser = 1 - expectedWinner

  const winnerCount = winner.comparisonCount + 1
  const loserCount = loser.comparisonCount + 1

  return {
    winner: {
      ...winner,
      score: updateRating(winner.score, expectedWinner, 1, config.kFactor),
      wins: winner.wins + 1,
      comparisonCount: winnerCount,
      confidence: confidenceFromCount(winnerCount),
      lastUpdated: timestamp,
    },
    loser: {
      ...loser,
      score: updateRating(loser.score, expectedLoser, 0, config.kFactor),
      losses: loser.losses + 1,
      comparisonCount: loserCount,
      confidence: confidenceFromCount(loserCount),
      lastUpdated: timestamp,
    },
  }
}
