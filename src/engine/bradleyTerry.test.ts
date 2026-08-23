import { fitBradleyTerry } from './bradleyTerry'
import type { Comparison } from '../domain/types'

let seq = 0
const cmp = (winner: string, loser: string): Comparison => ({
  id: `c${seq++}`,
  collectionId: 'c',
  itemAId: winner,
  itemBId: loser,
  winnerId: winner,
  timestamp: 't',
})

/** n comparisons where `winner` beats `loser`. */
const repeat = (winner: string, loser: string, n: number): Comparison[] =>
  Array.from({ length: n }, () => cmp(winner, loser))

const scoreOf = (fit: ReturnType<typeof fitBradleyTerry>, id: string) =>
  fit.results.find((r) => r.itemId === id)!

describe('fitBradleyTerry', () => {
  it('recovers a transitive order', () => {
    const ids = ['a', 'b', 'c']
    const comparisons = [
      ...repeat('a', 'b', 10),
      ...repeat('b', 'c', 10),
      ...repeat('a', 'c', 10),
    ]
    const fit = fitBradleyTerry(ids, comparisons)
    expect(fit.converged).toBe(true)
    expect(scoreOf(fit, 'a').score).toBeGreaterThan(scoreOf(fit, 'b').score)
    expect(scoreOf(fit, 'b').score).toBeGreaterThan(scoreOf(fit, 'c').score)
  })

  it('is order-independent (unlike Elo)', () => {
    const ids = ['a', 'b', 'c']
    const comparisons = [
      ...repeat('a', 'b', 6),
      ...repeat('c', 'a', 3),
      ...repeat('b', 'c', 5),
    ]
    const forward = fitBradleyTerry(ids, comparisons)
    const reversed = fitBradleyTerry(ids, [...comparisons].reverse())
    for (const id of ids) {
      expect(scoreOf(forward, id).score).toBeCloseTo(
        scoreOf(reversed, id).score,
        6,
      )
    }
  })

  it('gives equal, ~1000 scores when there are no comparisons', () => {
    const fit = fitBradleyTerry(['a', 'b', 'c'], [])
    for (const id of ['a', 'b', 'c']) {
      expect(scoreOf(fit, id).score).toBeCloseTo(1000, 6)
      expect(scoreOf(fit, id).comparisonCount).toBe(0)
    }
  })

  it('stays finite for an item that never loses (prior regularises)', () => {
    const fit = fitBradleyTerry(['a', 'b'], repeat('a', 'b', 5))
    expect(Number.isFinite(scoreOf(fit, 'a').score)).toBe(true)
    expect(scoreOf(fit, 'a').score).toBeGreaterThan(scoreOf(fit, 'b').score)
  })

  it('shrinks intervals as more comparisons accumulate', () => {
    const few = fitBradleyTerry(['a', 'b'], repeat('a', 'b', 2))
    const many = fitBradleyTerry(['a', 'b'], repeat('a', 'b', 50))
    expect(scoreOf(many, 'a').interval95).toBeLessThan(
      scoreOf(few, 'a').interval95,
    )
  })

  it('separates clearly-different items and overlaps equal ones', () => {
    // a beats b at a well-identified ~75% rate (lots of data on both sides);
    // c and d split evenly (a genuine tie). Note: a lopsided sweep would NOT
    // separate the intervals — it pins the order but not the magnitude.
    const ids = ['a', 'b', 'c', 'd']
    const comparisons = [
      ...repeat('a', 'b', 120),
      ...repeat('b', 'a', 40),
      ...repeat('c', 'd', 25),
      ...repeat('d', 'c', 25),
    ]
    const fit = fitBradleyTerry(ids, comparisons)
    const a = scoreOf(fit, 'a')
    const b = scoreOf(fit, 'b')
    const c = scoreOf(fit, 'c')
    const d = scoreOf(fit, 'd')

    // a and b clearly separated: intervals do not overlap.
    expect(a.score - a.interval95).toBeGreaterThan(b.score + b.interval95)
    // c and d are a tie: near-equal scores, overlapping intervals.
    expect(Math.abs(c.score - d.score)).toBeLessThan(c.interval95)
  })
})
