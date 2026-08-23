import { DexieRepository } from './repository'
import { RankerDatabase } from './db'
import { buildCollection, type GroupedCollectionSeed } from './buildCollection'
import type { Comparison } from '../domain/types'

let dbCounter = 0
function freshRepo() {
  // Unique db name per test keeps them isolated under fake-indexeddb.
  return new DexieRepository(new RankerDatabase(`test-db-${dbCounter++}`))
}

const seed: GroupedCollectionSeed = {
  name: 'Test',
  groups: [{ name: 'Album', items: [{ name: 'X' }, { name: 'Y' }] }],
}
const built = buildCollection(seed)
const cid = built.collection.id

const comparison = (id: string, winnerId: string): Comparison => ({
  id,
  collectionId: cid,
  itemAId: 'itm:test:album:x',
  itemBId: 'itm:test:album:y',
  winnerId,
  timestamp: '2026-08-23T12:00:00.000Z',
})

describe('DexieRepository', () => {
  it('seeds collection/groups/items and is idempotent', async () => {
    const repo = freshRepo()
    await repo.ensureSeeded(built)
    await repo.ensureSeeded(built) // second call must not throw or duplicate
    // A fresh comparison log should be empty after seeding.
    expect(await repo.getComparisons(cid)).toEqual([])
  })

  it('stores and returns comparisons in insertion order', async () => {
    const repo = freshRepo()
    await repo.ensureSeeded(built)
    await repo.addComparison(comparison('c1', 'itm:test:album:x'))
    await repo.addComparison(comparison('c2', 'itm:test:album:y'))

    const stored = await repo.getComparisons(cid)
    expect(stored.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(stored[0]).not.toHaveProperty('seq')
  })

  it('deletes a single comparison by id', async () => {
    const repo = freshRepo()
    await repo.addComparison(comparison('c1', 'itm:test:album:x'))
    await repo.addComparison(comparison('c2', 'itm:test:album:x'))
    await repo.deleteComparison('c1')

    const stored = await repo.getComparisons(cid)
    expect(stored.map((c) => c.id)).toEqual(['c2'])
  })

  it('clears all comparisons for a collection', async () => {
    const repo = freshRepo()
    await repo.addComparison(comparison('c1', 'itm:test:album:x'))
    await repo.addComparison(comparison('c2', 'itm:test:album:x'))
    await repo.clearComparisons(cid)

    expect(await repo.getComparisons(cid)).toEqual([])
  })
})
