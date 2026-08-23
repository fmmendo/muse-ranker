import { eloModel, bradleyTerryModel, getModel, MODELS } from './model'
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
const repeat = (w: string, l: string, n: number) =>
  Array.from({ length: n }, () => cmp(w, l))

const byId = (results: ReturnType<typeof eloModel.rank>, id: string) =>
  results.find((r) => r.itemId === id)!

describe('ranking models', () => {
  const ids = ['a', 'b', 'c']
  const log = [
    ...repeat('a', 'b', 8),
    ...repeat('b', 'c', 8),
    ...repeat('a', 'c', 8),
  ]

  it('registry exposes both models by id', () => {
    expect(getModel('elo')).toBe(eloModel)
    expect(getModel('bradley-terry')).toBe(bradleyTerryModel)
    expect(Object.keys(MODELS).sort()).toEqual(['bradley-terry', 'elo'])
  })

  it('both return one result per item and recover the order', () => {
    for (const model of [eloModel, bradleyTerryModel]) {
      const results = model.rank(ids, log)
      expect(results).toHaveLength(3)
      expect(byId(results, 'a').score).toBeGreaterThan(byId(results, 'b').score)
      expect(byId(results, 'b').score).toBeGreaterThan(byId(results, 'c').score)
    }
  })

  it('Elo provides confidence and W/L, no intervals', () => {
    const r = byId(eloModel.rank(ids, log), 'a')
    expect(r.confidence).toBeGreaterThan(0)
    expect(r.wins).toBeGreaterThan(0)
    expect(r.interval95).toBeUndefined()
    expect(eloModel.providesIntervals).toBe(false)
  })

  it('Bradley-Terry provides intervals', () => {
    const r = byId(bradleyTerryModel.rank(ids, log), 'a')
    expect(r.interval95).toBeGreaterThan(0)
    expect(bradleyTerryModel.providesIntervals).toBe(true)
  })
})
