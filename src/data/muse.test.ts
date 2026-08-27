import museJson from '../../public/datasets/muse.json'
import { parseDataset, datasetToSeed } from './dataset'
import { buildCollection } from './buildCollection'

const built = buildCollection(datasetToSeed(parseDataset(museJson)))

describe('Muse dataset (muse.json)', () => {
  it('parses and builds without duplicate-id errors', () => {
    expect(built.collection.name).toBe('Muse')
  })

  it('has all 10 studio albums', () => {
    expect(built.groups).toHaveLength(10)
  })

  it('has 115 standard + 4 bonus = 119 songs', () => {
    expect(built.items).toHaveLength(119)
    const bonus = built.items.filter((i) => i.metadata?.isBonus === true)
    expect(bonus).toHaveLength(4)
  })

  it('flags the four bonus tracks', () => {
    const bonus = built.items
      .filter((i) => i.metadata?.isBonus === true)
      .map((i) => i.name)
      .sort()
    expect(bonus).toEqual(['Fury', 'Futurism', 'Glorious', 'Spiral Static'])
  })

  it('preserves exact titles including ampersands', () => {
    expect(built.items.some((i) => i.name === 'The Sickness in You & I')).toBe(
      true,
    )
    expect(built.items.some((i) => i.name === 'Citizen Erased')).toBe(true)
  })

  it('carries labels, colour and year metadata', () => {
    expect(built.collection.groupLabelPlural).toBe('Albums')
    expect(built.collection.itemLabel).toBe('Song')
    const showbiz = built.groups.find((g) => g.name === 'Showbiz')!
    expect(showbiz.color).toBe('#6366f1')
    expect(showbiz.metadata?.year).toBe(1999)
  })
})
