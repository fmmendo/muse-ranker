import { generateRanking } from './ranking'
import { initialRating } from './elo'
import type { Rating } from '../domain/types'

const TS = '2026-08-23T12:00:00.000Z'
const rating = (itemId: string, score: number): Rating => ({
  ...initialRating(itemId, TS),
  score,
})

describe('generateRanking', () => {
  it('orders by score, highest first', () => {
    const ranked = generateRanking([
      rating('a', 1000),
      rating('b', 1200),
      rating('c', 900),
    ])
    expect(ranked.map((r) => r.rating.itemId)).toEqual(['b', 'a', 'c'])
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('uses standard competition ranking for ties (1, 2, 2, 4)', () => {
    const ranked = generateRanking([
      rating('a', 1200),
      rating('b', 1000),
      rating('c', 1000),
      rating('d', 800),
    ])
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4])
  })

  it('breaks score ties deterministically by itemId', () => {
    const ranked = generateRanking([rating('z', 1000), rating('a', 1000)])
    expect(ranked.map((r) => r.rating.itemId)).toEqual(['a', 'z'])
  })

  it('does not mutate the input array', () => {
    const input = [rating('a', 900), rating('b', 1100)]
    generateRanking(input)
    expect(input.map((r) => r.itemId)).toEqual(['a', 'b'])
  })

  it('handles an empty set', () => {
    expect(generateRanking([])).toEqual([])
  })
})
