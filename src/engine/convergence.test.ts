import { initialRating, recordComparison } from './elo'
import { generateRanking } from './ranking'
import type { Rating } from '../domain/types'

const TS = '2026-08-23T12:00:00.000Z'

// A deterministic pseudo-random generator (mulberry32) so the simulation is
// repeatable — no reliance on Math.random.
function rng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('Elo convergence (integration)', () => {
  it('recovers the true order from noisy pairwise outcomes', () => {
    // Five items with a known, strictly ordered "true strength". The stronger
    // item wins with a probability set by the strength gap, so there are upsets.
    const trueStrength: Record<string, number> = {
      a: 10,
      b: 8,
      c: 6,
      d: 4,
      e: 2,
    }
    const ids = Object.keys(trueStrength)

    const ratings = new Map<string, Rating>(
      ids.map((id) => [id, initialRating(id, TS)]),
    )

    // A gentler K keeps the snapshot from jittering around equilibrium.
    const config = { kFactor: 16, initialRating: 1000 }

    const random = rng(42)
    const pWin = (x: string, y: string) => {
      // Logistic on the true-strength gap.
      const gap = trueStrength[x] - trueStrength[y]
      return 1 / (1 + Math.exp(-gap))
    }

    for (let round = 0; round < 400; round++) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const x = ids[i]
          const y = ids[j]
          const xWins = random() < pWin(x, y)
          const winnerId = xWins ? x : y
          const loserId = xWins ? y : x
          const { winner, loser } = recordComparison(
            ratings.get(winnerId)!,
            ratings.get(loserId)!,
            TS,
            config,
          )
          ratings.set(winnerId, winner)
          ratings.set(loserId, loser)
        }
      }
    }

    const ranking = generateRanking([...ratings.values()])
    expect(ranking.map((r) => r.rating.itemId)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ])

    // Confidence should be high after hundreds of comparisons each.
    for (const r of ratings.values()) {
      expect(r.confidence).toBeGreaterThan(0.9)
    }
  })
})
