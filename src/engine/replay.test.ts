import { replayComparisons } from './replay'
import { initialRating, recordComparison } from './elo'
import type { Comparison } from '../domain/types'

const SEED = '2026-08-23T00:00:00.000Z'
const TS = '2026-08-23T12:00:00.000Z'

const comparison = (
  itemAId: string,
  itemBId: string,
  winnerId: string,
): Comparison => ({
  id: `${itemAId}-${itemBId}`,
  collectionId: 'col:test',
  itemAId,
  itemBId,
  winnerId,
  timestamp: TS,
})

describe('replayComparisons', () => {
  it('returns all-initial ratings for an empty history', () => {
    const ratings = replayComparisons(['a', 'b'], [], SEED)
    expect(ratings.get('a')).toEqual(initialRating('a', SEED))
    expect(ratings.get('b')).toEqual(initialRating('b', SEED))
  })

  it('matches an equivalent incremental computation', () => {
    const replayed = replayComparisons(
      ['a', 'b'],
      [comparison('a', 'b', 'a')],
      SEED,
    )

    const outcome = recordComparison(
      initialRating('a', SEED),
      initialRating('b', SEED),
      TS,
    )
    expect(replayed.get('a')!.score).toBeCloseTo(outcome.winner.score, 10)
    expect(replayed.get('b')!.score).toBeCloseTo(outcome.loser.score, 10)
  })

  it('resolves the loser whether the winner is item A or item B', () => {
    // winner is item B here
    const ratings = replayComparisons(
      ['a', 'b'],
      [comparison('a', 'b', 'b')],
      SEED,
    )
    expect(ratings.get('b')!.wins).toBe(1)
    expect(ratings.get('a')!.losses).toBe(1)
  })

  it('accumulates counts across multiple comparisons', () => {
    const ratings = replayComparisons(
      ['a', 'b', 'c'],
      [comparison('a', 'b', 'a'), comparison('a', 'c', 'a')],
      SEED,
    )
    expect(ratings.get('a')!.wins).toBe(2)
    expect(ratings.get('a')!.comparisonCount).toBe(2)
    expect(ratings.get('b')!.comparisonCount).toBe(1)
  })

  it('dropping the last comparison reproduces the pre-comparison state (undo)', () => {
    const history = [comparison('a', 'b', 'a'), comparison('a', 'c', 'a')]
    const afterUndo = replayComparisons(
      ['a', 'b', 'c'],
      history.slice(0, -1),
      SEED,
    )
    const expected = replayComparisons(
      ['a', 'b', 'c'],
      [comparison('a', 'b', 'a')],
      SEED,
    )
    expect(afterUndo.get('a')).toEqual(expected.get('a'))
    expect(afterUndo.get('c')).toEqual(expected.get('c'))
  })
})
