import { computeStats, WELL_RANKED_THRESHOLD, TARGET_PER_SONG } from './stats'
import type { Rating } from '../domain/types'

const rating = (
  itemId: string,
  comparisonCount: number,
  confidence: number,
): Rating => ({
  itemId,
  score: 1000,
  confidence,
  wins: 0,
  losses: 0,
  comparisonCount,
  lastUpdated: 't',
})

describe('computeStats', () => {
  it('handles an empty/fresh session', () => {
    const stats = computeStats([rating('a', 0, 0), rating('b', 0, 0)], 0)
    expect(stats.totalSongs).toBe(2)
    expect(stats.songsCompared).toBe(0)
    expect(stats.coverage).toBe(0)
    expect(stats.meanConfidence).toBe(0)
    expect(stats.wellRankedCount).toBe(0)
    // each of 2 songs needs TARGET_PER_SONG, two per comparison
    expect(stats.estimatedRemaining).toBe(TARGET_PER_SONG) // ceil(2*8 / 2)
  })

  it('computes coverage and mean confidence', () => {
    const stats = computeStats(
      [rating('a', 4, 0.5), rating('b', 0, 0), rating('c', 2, 0.25)],
      3,
    )
    expect(stats.songsCompared).toBe(2)
    expect(stats.coverage).toBeCloseTo(2 / 3, 10)
    expect(stats.meanConfidence).toBeCloseTo((0.5 + 0 + 0.25) / 3, 10)
  })

  it('counts well-ranked songs at the threshold', () => {
    const stats = computeStats(
      [
        rating('a', WELL_RANKED_THRESHOLD, 0.9),
        rating('b', WELL_RANKED_THRESHOLD - 1, 0.4),
      ],
      10,
    )
    expect(stats.wellRankedCount).toBe(1)
  })

  it('estimates remaining as the per-song deficit halved', () => {
    // a needs 0 more, b needs 8 more -> deficit 8 -> ceil(8/2) = 4
    const stats = computeStats(
      [rating('a', TARGET_PER_SONG, 0.8), rating('b', 0, 0)],
      5,
    )
    expect(stats.estimatedRemaining).toBe(4)
  })

  it('buckets confidence into five bands summing to the song count', () => {
    const stats = computeStats(
      [
        rating('a', 1, 0.05),
        rating('b', 1, 0.35),
        rating('c', 1, 0.75),
        rating('d', 1, 0.99),
      ],
      2,
    )
    const total = stats.confidenceBuckets.reduce((s, b) => s + b.count, 0)
    expect(total).toBe(4)
    expect(stats.confidenceBuckets[0].count).toBe(1) // 0-20%
    expect(stats.confidenceBuckets[4].count).toBe(1) // 80-100%
  })
})
