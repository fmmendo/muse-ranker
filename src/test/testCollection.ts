import { buildCollection } from '../data/buildCollection'

/** A small, self-contained collection for component/integration tests. */
export const testCollection = buildCollection({
  name: 'Test Muse',
  description: 'test collection',
  groupLabel: 'Album',
  groupLabelPlural: 'Albums',
  itemLabel: 'Song',
  itemLabelPlural: 'Songs',
  groups: [
    {
      name: 'Album A',
      color: '#ef4444',
      metadata: { year: 2001 },
      items: [{ name: 'A1' }, { name: 'A2' }, { name: 'A3' }],
    },
    {
      name: 'Album B',
      metadata: { year: 2003 },
      items: [
        { name: 'B1' },
        { name: 'B2' },
        { name: 'B Bonus', metadata: { isBonus: true } },
      ],
    },
  ],
})
