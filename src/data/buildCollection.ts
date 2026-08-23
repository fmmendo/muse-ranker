import type { Collection, Group, Item, IsoDate } from '../domain/types'
import { collectionId, groupId, itemId } from '../domain/ids'

// A plain, domain-agnostic description of a collection to seed. The ranking
// engine never sees this shape — it's only used to construct the normalised
// Collection / Group / Item entities.

export interface ItemSeed {
  name: string
  metadata?: Record<string, unknown>
}

export interface GroupSeed {
  name: string
  metadata?: Record<string, unknown>
  items: ItemSeed[]
}

export interface GroupedCollectionSeed {
  name: string
  description?: string
  createdDate?: IsoDate
  groups: GroupSeed[]
}

export interface BuiltCollection {
  collection: Collection
  groups: Group[]
  items: Item[]
}

/** Fixed date so seed data is fully deterministic (stable ids + timestamps). */
const DEFAULT_SEED_DATE: IsoDate = '2026-08-23T00:00:00.000Z'

/**
 * Expand a grouped seed into normalised entities with deterministic ids.
 * Throws on a duplicate item id, which surfaces accidental duplicate titles in
 * the source data rather than silently dropping one.
 */
export function buildCollection(seed: GroupedCollectionSeed): BuiltCollection {
  const date = seed.createdDate ?? DEFAULT_SEED_DATE
  const cId = collectionId(seed.name)

  const collection: Collection = {
    id: cId,
    name: seed.name,
    description: seed.description,
    createdDate: date,
    updatedDate: date,
  }

  const groups: Group[] = []
  const items: Item[] = []
  const seenItemIds = new Set<string>()

  for (const group of seed.groups) {
    const gId = groupId(seed.name, group.name)
    groups.push({
      id: gId,
      collectionId: cId,
      name: group.name,
      metadata: group.metadata,
    })

    for (const item of group.items) {
      const iId = itemId(seed.name, group.name, item.name)
      if (seenItemIds.has(iId)) {
        throw new Error(
          `Duplicate item id "${iId}" (title "${item.name}" in group "${group.name}")`,
        )
      }
      seenItemIds.add(iId)
      items.push({
        id: iId,
        collectionId: cId,
        groupId: gId,
        name: item.name,
        metadata: item.metadata,
      })
    }
  }

  return { collection, groups, items }
}
