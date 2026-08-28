import {
  DEFAULT_SETTINGS,
  type Collection,
  type Group,
  type Item,
  type IsoDate,
  type PairSelectionWeights,
} from '../domain/types'
import { collectionId, groupId, itemId } from '../domain/ids'

/** Optional per-dataset overrides for ranking behaviour (operator config). */
export interface SeedConfig {
  eloKFactor?: number
  avoidWindow?: number
  pairWeights?: Partial<PairSelectionWeights>
  syncUrl?: string
}

/** Fully-resolved ranking config (dataset overrides merged onto defaults). */
export interface ResolvedConfig {
  eloKFactor: number
  avoidWindow: number
  pairWeights: PairSelectionWeights
  /** Sync API base URL; undefined = local-only (no multi-user). */
  syncUrl?: string
}

function resolveConfig(config: SeedConfig | undefined): ResolvedConfig {
  return {
    eloKFactor: config?.eloKFactor ?? DEFAULT_SETTINGS.eloKFactor,
    avoidWindow: config?.avoidWindow ?? DEFAULT_SETTINGS.avoidWindow,
    syncUrl: config?.syncUrl,
    pairWeights: {
      ...DEFAULT_SETTINGS.pairSelectionWeights,
      ...(config?.pairWeights ?? {}),
    },
  }
}

// A plain, domain-agnostic description of a collection to seed. The ranking
// engine never sees this shape — it's only used to construct the normalised
// Collection / Group / Item entities.

export interface ItemSeed {
  name: string
  description?: string
  image?: string
  metadata?: Record<string, unknown>
}

export interface GroupSeed {
  name: string
  description?: string
  color?: string
  image?: string
  metadata?: Record<string, unknown>
  items: ItemSeed[]
}

export interface GroupedCollectionSeed {
  name: string
  description?: string
  groupLabel?: string
  groupLabelPlural?: string
  itemLabel?: string
  itemLabelPlural?: string
  createdDate?: IsoDate
  config?: SeedConfig
  groups: GroupSeed[]
}

export interface BuiltCollection {
  collection: Collection
  groups: Group[]
  items: Item[]
  config: ResolvedConfig
}

/** Fixed date so seed data is fully deterministic (stable ids + timestamps). */
const DEFAULT_SEED_DATE: IsoDate = '2026-08-23T00:00:00.000Z'

/**
 * Expand a grouped seed into normalised entities with deterministic ids.
 * Throws on a duplicate item id, which surfaces accidental duplicate titles in
 * the source data rather than silently dropping one. An item with no image
 * inherits its group's image, so downstream code can read `item.image` directly.
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
    groupLabel: seed.groupLabel,
    groupLabelPlural: seed.groupLabelPlural,
    itemLabel: seed.itemLabel,
    itemLabelPlural: seed.itemLabelPlural,
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
      description: group.description,
      color: group.color,
      image: group.image,
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
        description: item.description,
        image: item.image ?? group.image,
        metadata: item.metadata,
      })
    }
  }

  return { collection, groups, items, config: resolveConfig(seed.config) }
}
