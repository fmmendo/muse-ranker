import { buildCollection, type GroupedCollectionSeed } from './buildCollection'

const seed: GroupedCollectionSeed = {
  name: 'Test',
  description: 'a test collection',
  groups: [
    {
      name: 'Album One',
      metadata: { year: 2001 },
      items: [{ name: 'Song A' }, { name: 'Song B' }],
    },
    {
      name: 'Album Two',
      items: [{ name: 'Song C' }],
    },
  ],
}

describe('buildCollection', () => {
  it('produces one collection, correct group and item counts', () => {
    const built = buildCollection(seed)
    expect(built.collection.id).toBe('col:test')
    expect(built.groups).toHaveLength(2)
    expect(built.items).toHaveLength(3)
  })

  it('links items to their group and collection', () => {
    const built = buildCollection(seed)
    const songA = built.items.find((i) => i.name === 'Song A')!
    expect(songA.id).toBe('itm:test:album-one:song-a')
    expect(songA.groupId).toBe('grp:test:album-one')
    expect(songA.collectionId).toBe('col:test')
  })

  it('carries group metadata through', () => {
    const built = buildCollection(seed)
    const albumOne = built.groups.find((g) => g.name === 'Album One')!
    expect(albumOne.metadata).toEqual({ year: 2001 })
  })

  it('uses a deterministic default date', () => {
    const built = buildCollection(seed)
    expect(built.collection.createdDate).toBe(built.collection.updatedDate)
    expect(built.collection.createdDate).toBe('2026-08-23T00:00:00.000Z')
  })

  it('throws on duplicate item ids within a group', () => {
    const dupe: GroupedCollectionSeed = {
      name: 'Dupe',
      groups: [{ name: 'A', items: [{ name: 'X' }, { name: 'X' }] }],
    }
    expect(() => buildCollection(dupe)).toThrow(/Duplicate item id/)
  })
})
