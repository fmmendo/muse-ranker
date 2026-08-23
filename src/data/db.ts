import Dexie, { type Table } from 'dexie'
import type { Collection, Comparison, Group, Item } from '../domain/types'

// Comparisons get an auto-incrementing `seq` as their primary key so we can
// replay them in exact insertion order (ISO timestamps can collide on fast
// clicks within the same millisecond). The domain `id` (uuid) stays as an index
// for deletes/undo.
export type StoredComparison = Comparison & { seq?: number }

export class RankerDatabase extends Dexie {
  collections!: Table<Collection, string>
  groups!: Table<Group, string>
  items!: Table<Item, string>
  comparisons!: Table<StoredComparison, number>

  constructor(name = 'preference-ranker') {
    super(name)
    this.version(1).stores({
      collections: 'id',
      groups: 'id, collectionId',
      items: 'id, collectionId, groupId',
      comparisons: '++seq, id, collectionId',
    })
  }
}
