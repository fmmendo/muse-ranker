import type { Comparison, Id, IsoDate, Rating } from '../domain/types'
import {
  DEFAULT_ELO_CONFIG,
  initialRating,
  recordComparison,
  type EloConfig,
} from './elo'

/**
 * Rebuild every item's rating by replaying the full comparison history from
 * scratch. Because Elo updates are sequence-dependent and not cleanly
 * reversible, replay is the robust way to support undo, edits, and loading a
 * saved history: state is always a pure function of the comparison log.
 *
 * Cost is O(comparisons); trivial for the scale here (hundreds).
 */
export function replayComparisons(
  itemIds: readonly Id[],
  comparisons: readonly Comparison[],
  seedDate: IsoDate,
  config: EloConfig = DEFAULT_ELO_CONFIG,
): Map<Id, Rating> {
  const ratings = new Map<Id, Rating>(
    itemIds.map((id) => [id, initialRating(id, seedDate, config)]),
  )

  for (const comparison of comparisons) {
    const loserId =
      comparison.winnerId === comparison.itemAId
        ? comparison.itemBId
        : comparison.itemAId
    const winner = ratings.get(comparison.winnerId)
    const loser = ratings.get(loserId)
    if (!winner || !loser) continue // item no longer in the set; skip defensively

    const outcome = recordComparison(
      winner,
      loser,
      comparison.timestamp,
      config,
    )
    ratings.set(comparison.winnerId, outcome.winner)
    ratings.set(loserId, outcome.loser)
  }

  return ratings
}
