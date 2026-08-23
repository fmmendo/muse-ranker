import type { Rating } from '../domain/types'

export interface RankedItem {
  /** 1-based position, using standard competition ranking (1, 2, 2, 4). */
  rank: number
  rating: Rating
}

/**
 * Produce an ordered leaderboard from a set of ratings, highest score first.
 *
 * Ties (equal scores) share a rank and the next rank skips accordingly, e.g.
 * two items tied for 2nd are both rank 2 and the following item is rank 4.
 * The sort is deterministic: equal scores are ordered by itemId as a tiebreak
 * so the output is stable across calls.
 */
export function generateRanking(ratings: Rating[]): RankedItem[] {
  const sorted = [...ratings].sort(
    (a, b) => b.score - a.score || a.itemId.localeCompare(b.itemId),
  )

  const ranked: RankedItem[] = []
  let previousScore: number | null = null
  let previousRank = 0

  sorted.forEach((rating, index) => {
    const rank =
      previousScore !== null && rating.score === previousScore
        ? previousRank
        : index + 1
    ranked.push({ rank, rating })
    previousScore = rating.score
    previousRank = rank
  })

  return ranked
}
