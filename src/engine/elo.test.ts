import {
  expectedScore,
  updateRating,
  confidenceFromCount,
  initialRating,
  recordComparison,
  DEFAULT_ELO_CONFIG,
} from './elo'
import type { Rating } from '../domain/types'

const TS = '2026-08-23T12:00:00.000Z'

describe('expectedScore', () => {
  it('is 0.5 for equal ratings', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 10)
  })

  it('favours the higher-rated player', () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5)
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5)
  })

  it('is symmetric: E_A + E_B = 1', () => {
    const a = expectedScore(1337, 980)
    const b = expectedScore(980, 1337)
    expect(a + b).toBeCloseTo(1, 10)
  })

  it('gives ~0.76 for a 200-point advantage', () => {
    expect(expectedScore(1200, 1000)).toBeCloseTo(0.7597, 3)
  })
})

describe('updateRating', () => {
  it('increases rating on an expected-ish win', () => {
    const updated = updateRating(1000, 0.5, 1, 32)
    expect(updated).toBe(1016)
  })

  it('decreases rating on a loss', () => {
    const updated = updateRating(1000, 0.5, 0, 32)
    expect(updated).toBe(984)
  })

  it('barely moves a heavy favourite that wins', () => {
    const expected = expectedScore(1600, 1000)
    const updated = updateRating(1600, expected, 1, 32)
    expect(updated - 1600).toBeLessThan(4)
  })
})

describe('confidenceFromCount', () => {
  it('is 0 with no comparisons', () => {
    expect(confidenceFromCount(0)).toBe(0)
  })

  it('is 0.5 at the smoothing point and rises monotonically', () => {
    expect(confidenceFromCount(10)).toBeCloseTo(0.5, 10)
    expect(confidenceFromCount(30)).toBeGreaterThan(confidenceFromCount(10))
    expect(confidenceFromCount(1000)).toBeLessThan(1)
  })
})

describe('initialRating', () => {
  it('starts at the configured rating with zeroed stats', () => {
    const r = initialRating('itm:x', TS)
    expect(r.score).toBe(DEFAULT_ELO_CONFIG.initialRating)
    expect(r).toMatchObject({
      itemId: 'itm:x',
      confidence: 0,
      wins: 0,
      losses: 0,
      comparisonCount: 0,
      lastUpdated: TS,
    })
  })
})

describe('recordComparison', () => {
  const make = (itemId: string, score: number): Rating => ({
    ...initialRating(itemId, TS),
    score,
  })

  it('moves the winner up and the loser down', () => {
    const { winner, loser } = recordComparison(
      make('a', 1000),
      make('b', 1000),
      TS,
    )
    expect(winner.score).toBeGreaterThan(1000)
    expect(loser.score).toBeLessThan(1000)
  })

  it('is zero-sum: winner gain equals loser loss', () => {
    const { winner, loser } = recordComparison(
      make('a', 1100),
      make('b', 900),
      TS,
    )
    const gain = winner.score - 1100
    const loss = 900 - loser.score
    expect(gain).toBeCloseTo(loss, 10)
  })

  it('rewards an upset more than an expected win', () => {
    const expectedWin = recordComparison(
      make('fav', 1400),
      make('dog', 1000),
      TS,
    )
    const upset = recordComparison(make('dog', 1000), make('fav', 1400), TS)
    const expectedGain = expectedWin.winner.score - 1400
    const upsetGain = upset.winner.score - 1000
    expect(upsetGain).toBeGreaterThan(expectedGain)
  })

  it('increments counts, wins/losses and confidence', () => {
    const { winner, loser } = recordComparison(
      make('a', 1000),
      make('b', 1000),
      TS,
    )
    expect(winner.wins).toBe(1)
    expect(winner.losses).toBe(0)
    expect(winner.comparisonCount).toBe(1)
    expect(loser.losses).toBe(1)
    expect(loser.comparisonCount).toBe(1)
    expect(winner.confidence).toBeGreaterThan(0)
  })

  it('does not mutate its inputs', () => {
    const a = make('a', 1000)
    const b = make('b', 1000)
    recordComparison(a, b, TS)
    expect(a.score).toBe(1000)
    expect(a.comparisonCount).toBe(0)
    expect(b.score).toBe(1000)
  })

  it('respects a custom K-factor', () => {
    const gentle = recordComparison(make('a', 1000), make('b', 1000), TS, {
      ...DEFAULT_ELO_CONFIG,
      kFactor: 8,
    })
    expect(gentle.winner.score - 1000).toBeCloseTo(4, 10)
  })
})
