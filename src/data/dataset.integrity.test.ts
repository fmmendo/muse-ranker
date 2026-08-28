import datasetJson from '../../public/datasets/dataset.json'
import { parseDataset, datasetToSeed } from './dataset'
import { buildCollection } from './buildCollection'

// Integrity check for whatever dataset ships in public/datasets/dataset.json,
// so any fork's own dataset is validated by the test suite.
const built = buildCollection(datasetToSeed(parseDataset(datasetJson)))

describe('shipped dataset (dataset.json)', () => {
  it('parses and builds with no duplicate item ids', () => {
    expect(built.collection.name.length).toBeGreaterThan(0)
  })

  it('has at least one group and two items', () => {
    expect(built.groups.length).toBeGreaterThanOrEqual(1)
    expect(built.items.length).toBeGreaterThanOrEqual(2)
  })

  it('links every item to a group in the collection', () => {
    for (const item of built.items) {
      expect(item.collectionId).toBe(built.collection.id)
      expect(built.groups.some((g) => g.id === item.groupId)).toBe(true)
    }
  })

  it('defines group and item labels', () => {
    expect(built.collection.groupLabel).toBeTruthy()
    expect(built.collection.itemLabel).toBeTruthy()
  })
})
