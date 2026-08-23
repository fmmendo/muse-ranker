import type { BuiltCollection } from './buildCollection'
import type { Comparison, Id } from '../domain/types'
import { RankerDatabase } from './db'

/**
 * Storage boundary for the app. The ranking engine and UI depend on this
 * interface, never on Dexie/IndexedDB directly, so the storage layer can be
 * swapped (e.g. for a future backend) without touching anything above it.
 *
 * Ratings are intentionally NOT persisted: they are a pure function of the
 * comparison log (see replayComparisons), so persisting only the log keeps the
 * store small and avoids any risk of the two drifting out of sync.
 */
export interface RankerRepository {
  /** Persist a collection's static entities on first run (idempotent). */
  ensureSeeded(built: BuiltCollection): Promise<void>
  /** All comparisons for a collection, in insertion (chronological) order. */
  getComparisons(collectionId: Id): Promise<Comparison[]>
  addComparison(comparison: Comparison): Promise<void>
  deleteComparison(id: Id): Promise<void>
  clearComparisons(collectionId: Id): Promise<void>
}

export class DexieRepository implements RankerRepository {
  private db: RankerDatabase

  constructor(db: RankerDatabase = new RankerDatabase()) {
    this.db = db
  }

  async ensureSeeded(built: BuiltCollection): Promise<void> {
    const existing = await this.db.collections.get(built.collection.id)
    if (existing) return
    await this.db.transaction(
      'rw',
      this.db.collections,
      this.db.groups,
      this.db.items,
      async () => {
        await this.db.collections.put(built.collection)
        await this.db.groups.bulkPut(built.groups)
        await this.db.items.bulkPut(built.items)
      },
    )
  }

  async getComparisons(collectionId: Id): Promise<Comparison[]> {
    const rows = await this.db.comparisons
      .where('collectionId')
      .equals(collectionId)
      .sortBy('seq')
    return rows.map((r) => ({
      id: r.id,
      collectionId: r.collectionId,
      itemAId: r.itemAId,
      itemBId: r.itemBId,
      winnerId: r.winnerId,
      timestamp: r.timestamp,
    }))
  }

  async addComparison(comparison: Comparison): Promise<void> {
    await this.db.comparisons.add({ ...comparison })
  }

  async deleteComparison(id: Id): Promise<void> {
    await this.db.comparisons.where('id').equals(id).delete()
  }

  async clearComparisons(collectionId: Id): Promise<void> {
    await this.db.comparisons
      .where('collectionId')
      .equals(collectionId)
      .delete()
  }
}

/**
 * In-memory repository for tests and previews. Same contract, no IndexedDB.
 */
export class InMemoryRepository implements RankerRepository {
  private seeded = new Set<Id>()
  private comparisons: Comparison[] = []

  async ensureSeeded(built: BuiltCollection): Promise<void> {
    this.seeded.add(built.collection.id)
  }

  async getComparisons(collectionId: Id): Promise<Comparison[]> {
    return this.comparisons.filter((c) => c.collectionId === collectionId)
  }

  async addComparison(comparison: Comparison): Promise<void> {
    this.comparisons.push({ ...comparison })
  }

  async deleteComparison(id: Id): Promise<void> {
    this.comparisons = this.comparisons.filter((c) => c.id !== id)
  }

  async clearComparisons(collectionId: Id): Promise<void> {
    this.comparisons = this.comparisons.filter(
      (c) => c.collectionId !== collectionId,
    )
  }
}

let sharedRepository: RankerRepository | null = null

/** The app-wide Dexie-backed repository (created lazily on first use). */
export function defaultRepository(): RankerRepository {
  if (!sharedRepository) sharedRepository = new DexieRepository()
  return sharedRepository
}
