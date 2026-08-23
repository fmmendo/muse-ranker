import { muse, museAlbums } from './muse'

describe('Muse dataset', () => {
  it('builds without duplicate-id errors', () => {
    // buildCollection throws on duplicates; reaching here means it's clean.
    expect(muse.collection.name).toBe('Muse')
  })

  it('has all 10 studio albums', () => {
    expect(muse.groups).toHaveLength(10)
  })

  it('has the expected total number of songs (115 standard + 4 bonus)', () => {
    const standard = museAlbums.reduce((n, a) => n + a.tracks.length, 0)
    const bonus = museAlbums.reduce(
      (n, a) => n + (a.bonusTracks?.length ?? 0),
      0,
    )
    expect(standard).toBe(115)
    expect(bonus).toBe(4)
    expect(muse.items).toHaveLength(119)
  })

  it('flags bonus tracks in metadata', () => {
    const bonus = muse.items.filter((i) => i.metadata?.isBonus === true)
    expect(bonus.map((i) => i.name).sort()).toEqual([
      'Fury',
      'Futurism',
      'Glorious',
      'Spiral Static',
    ])
  })

  it('every item is linked to a group and the collection', () => {
    for (const item of muse.items) {
      expect(item.collectionId).toBe(muse.collection.id)
      expect(muse.groups.some((g) => g.id === item.groupId)).toBe(true)
    }
  })

  it('preserves exact titles, including ampersands', () => {
    expect(muse.items.some((i) => i.name === 'The Sickness in You & I')).toBe(
      true,
    )
    expect(muse.items.some((i) => i.name === 'Citizen Erased')).toBe(true)
  })
})
