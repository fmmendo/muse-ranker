import type { Comparison } from '../domain/types'

// Client for the sync API (the Cloudflare Worker). Local-first: this is an
// additive mirror of the user's comparison log + a reader for the pooled
// aggregate. Callers treat writes as fire-and-forget (failures never block the
// local UX); reads (fetchAggregate) surface errors so the Global view can
// show a fallback.

export interface AggregatePair {
  itemAId: string
  itemBId: string
  aWins: number
  bWins: number
}

export interface AggregateResult {
  pairs: AggregatePair[]
  users: number
}

export interface CloudSync {
  pushComparisons(comparisons: readonly Comparison[]): Promise<void>
  deleteComparison(id: string): Promise<void>
  reset(): Promise<void>
  fetchAggregate(): Promise<AggregateResult>
}

/** Max comparisons per POST (matches the worker's MAX_BATCH). */
const PUSH_BATCH = 500

/**
 * Expand pooled per-pair tallies into a synthetic comparison log that the
 * existing Bradley-Terry engine can rank. Only winnerId + the two item ids
 * matter to the fit (it's order-independent), so ids/timestamps are stubs.
 */
export function expandTalliesToLog(
  pairs: readonly AggregatePair[],
): Comparison[] {
  const log: Comparison[] = []
  let n = 0
  const make = (a: string, b: string, winner: string): Comparison => ({
    id: `agg-${n++}`,
    collectionId: 'aggregate',
    itemAId: a,
    itemBId: b,
    winnerId: winner,
    timestamp: '',
  })
  for (const p of pairs) {
    for (let i = 0; i < p.aWins; i++)
      log.push(make(p.itemAId, p.itemBId, p.itemAId))
    for (let i = 0; i < p.bWins; i++)
      log.push(make(p.itemAId, p.itemBId, p.itemBId))
  }
  return log
}

export interface CloudSyncOptions {
  baseUrl: string
  collectionId: string
  userId: string
  /** Injectable for tests. */
  fetchImpl?: typeof fetch
}

export function createCloudSync(options: CloudSyncOptions): CloudSync {
  const { collectionId, userId } = options
  const doFetch = options.fetchImpl ?? fetch.bind(globalThis)
  const base = options.baseUrl.replace(/\/+$/, '')
  const cid = encodeURIComponent(collectionId)

  return {
    async pushComparisons(comparisons) {
      for (let i = 0; i < comparisons.length; i += PUSH_BATCH) {
        const batch = comparisons.slice(i, i + PUSH_BATCH).map((c) => ({
          id: c.id,
          itemAId: c.itemAId,
          itemBId: c.itemBId,
          winnerId: c.winnerId,
          createdAt: Date.parse(c.timestamp) || undefined,
        }))
        await doFetch(`${base}/c/${cid}/comparisons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, comparisons: batch }),
        })
      }
    },

    async deleteComparison(id) {
      await doFetch(
        `${base}/c/${cid}/comparisons/${encodeURIComponent(id)}` +
          `?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
      )
    },

    async reset() {
      await doFetch(`${base}/c/${cid}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
    },

    async fetchAggregate() {
      const res = await doFetch(`${base}/c/${cid}/aggregate`)
      if (!res.ok) throw new Error(`aggregate failed (${res.status})`)
      return (await res.json()) as AggregateResult
    },
  }
}
