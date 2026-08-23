import {
  randomPair,
  chooseStrategy,
  kNearestByScore,
  selectPair,
  pairKey,
  type PairSelectionContext,
} from './pairSelection'
import type { Comparison, Id, Item, Rating } from '../domain/types'

const item = (id: string): Item => ({ id, collectionId: 'c', name: id })
const rating = (id: string, score: number, confidence = 0): Rating => ({
  itemId: id,
  score,
  confidence,
  wins: 0,
  losses: 0,
  comparisonCount: 0,
  lastUpdated: 't',
})
const ratingsOf = (rs: Rating[]) =>
  new Map<Id, Rating>(rs.map((r) => [r.itemId, r]))
// Deterministic random: yields the given values, then repeats the last.
const seq = (values: number[]) => {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

const WEIGHTS = {
  similarRating: 0.4,
  lowConfidence: 0.3,
  random: 0.2,
  verification: 0.1,
}

describe('randomPair', () => {
  it('throws with fewer than two items', () => {
    expect(() => randomPair([])).toThrow(/at least two/)
    expect(() => randomPair(['only'])).toThrow(/at least two/)
  })

  it('always returns two distinct items', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const random = seq([0.0, 0.99, 0.5, 0.5, 0.99, 0.0, 0.2, 0.2])
    for (let n = 0; n < 4; n++) {
      const [x, y] = randomPair(items, random)
      expect(x).not.toBe(y)
    }
  })

  it('can select the last item (no off-by-one exclusion)', () => {
    const [x, y] = randomPair(['a', 'b', 'c'], () => 0.99)
    expect(x).toBe('c')
    expect(y).not.toBe('c')
  })
})

describe('chooseStrategy', () => {
  it('maps random ranges to strategies by weight', () => {
    expect(chooseStrategy(WEIGHTS, () => 0.0)).toBe('similarRating')
    expect(chooseStrategy(WEIGHTS, () => 0.5)).toBe('lowConfidence')
    expect(chooseStrategy(WEIGHTS, () => 0.75)).toBe('random')
    expect(chooseStrategy(WEIGHTS, () => 0.95)).toBe('verification')
  })

  it('falls back to random when all weights are zero', () => {
    expect(
      chooseStrategy(
        { similarRating: 0, lowConfidence: 0, random: 0, verification: 0 },
        () => 0.5,
      ),
    ).toBe('random')
  })
})

describe('kNearestByScore', () => {
  it('returns the k closest items by score, excluding the anchor', () => {
    const items = [item('a'), item('b'), item('c'), item('d')]
    const ratings = ratingsOf([
      rating('a', 100),
      rating('b', 105),
      rating('c', 200),
      rating('d', 400),
    ])
    const near = kNearestByScore('a', items, ratings, 2)
    expect(near.map((i) => i.id)).toEqual(['b', 'c'])
  })
})

describe('selectPair', () => {
  const items = [item('a'), item('b'), item('c'), item('d')]
  const ratings = ratingsOf([
    rating('a', 100, 0.9),
    rating('b', 102, 0.8),
    rating('c', 300, 0.1),
    rating('d', 305, 0.0),
  ])
  const ctx = (
    over: Partial<PairSelectionContext> = {},
  ): PairSelectionContext => ({
    items,
    ratings,
    comparisons: [],
    weights: WEIGHTS,
    ...over,
  })

  it('throws with fewer than two items', () => {
    expect(() => selectPair(ctx({ items: [item('a')] }))).toThrow(
      /at least two/,
    )
  })

  it('always returns two distinct items', () => {
    for (let n = 0; n < 20; n++) {
      const [x, y] = selectPair(
        ctx(),
        seq([n / 20, ((n * 7) % 20) / 20, 0.3, 0.6]),
      )
      expect(x.id).not.toBe(y.id)
    }
  })

  it('similarRating pairs an anchor with a near-score opponent', () => {
    // strategy=similarRating (r<0.4 boundary via weight-only), anchor=a, opp=nearest(b)
    const pair = selectPair(
      ctx({
        weights: {
          similarRating: 1,
          lowConfidence: 0,
          random: 0,
          verification: 0,
        },
      }),
      seq([0.0, 0.0, 0.0]),
    )
    expect(pair.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('verification re-presents a previously compared pair', () => {
    const comparisons: Comparison[] = [
      {
        id: 'x',
        collectionId: 'c',
        itemAId: 'c',
        itemBId: 'd',
        winnerId: 'c',
        timestamp: 't',
      },
    ]
    const pair = selectPair(
      ctx({
        comparisons,
        weights: {
          similarRating: 0,
          lowConfidence: 0,
          random: 0,
          verification: 1,
        },
      }),
      seq([0.0, 0.0]),
    )
    expect(pair.map((i) => i.id).sort()).toEqual(['c', 'd'])
  })

  it('terminates even when the only possible pair is the avoided one', () => {
    const two = [item('a'), item('b')]
    const [x, y] = selectPair(
      ctx({
        items: two,
        weights: {
          similarRating: 0,
          lowConfidence: 0,
          random: 1,
          verification: 0,
        },
        avoidPairKey: pairKey('a', 'b'),
      }),
      seq([0.3, 0.3, 0.3]),
    )
    expect(new Set([x.id, y.id])).toEqual(new Set(['a', 'b']))
  })
})
