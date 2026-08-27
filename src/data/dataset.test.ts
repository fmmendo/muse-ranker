import { parseDataset, resolveImage, datasetToSeed } from './dataset'

const valid = {
  version: 1,
  name: 'X',
  description: 'a set',
  group: { label: 'Album', labelPlural: 'Albums' },
  item: { label: 'Song' },
  groups: [
    {
      name: 'G',
      color: '#ffffff',
      image: 'images/g.jpg',
      metadata: { year: 2000 },
      items: [{ name: 'I', metadata: { isBonus: true } }],
    },
  ],
}

describe('parseDataset', () => {
  it('accepts a valid dataset', () => {
    const d = parseDataset(valid)
    expect(d.name).toBe('X')
    expect(d.groups[0].items[0].name).toBe('I')
    expect(d.group?.labelPlural).toBe('Albums')
  })

  it('throws on a non-object root', () => {
    expect(() => parseDataset(null)).toThrow(/Invalid dataset/)
  })

  it('throws on a missing version', () => {
    expect(() => parseDataset({ name: 'X', groups: [] })).toThrow(/version/)
  })

  it('throws on empty groups', () => {
    expect(() => parseDataset({ version: 1, name: 'X', groups: [] })).toThrow(
      /non-empty/,
    )
  })

  it('throws on a group with no items', () => {
    expect(() =>
      parseDataset({
        version: 1,
        name: 'X',
        groups: [{ name: 'G', items: [] }],
      }),
    ).toThrow(/items/)
  })

  it('throws on an item missing a name', () => {
    expect(() =>
      parseDataset({
        version: 1,
        name: 'X',
        groups: [{ name: 'G', items: [{}] }],
      }),
    ).toThrow(/name/)
  })
})

describe('resolveImage', () => {
  it('prefixes relative paths with the base dir', () => {
    expect(resolveImage('images/x.jpg', '/data/')).toBe('/data/images/x.jpg')
  })

  it('leaves absolute URLs and root paths untouched', () => {
    expect(resolveImage('https://e.com/x.jpg', '/data/')).toBe(
      'https://e.com/x.jpg',
    )
    expect(resolveImage('/x.jpg', '/data/')).toBe('/x.jpg')
  })

  it('returns undefined when there is no image', () => {
    expect(resolveImage(undefined, '/data/')).toBeUndefined()
  })
})

describe('datasetToSeed', () => {
  it('maps labels and resolves image URIs', () => {
    const seed = datasetToSeed(parseDataset(valid), '/data/')
    expect(seed.groupLabelPlural).toBe('Albums')
    expect(seed.itemLabel).toBe('Song')
    expect(seed.groups[0].image).toBe('/data/images/g.jpg')
  })
})
