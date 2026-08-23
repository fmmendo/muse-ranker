import { useCallback, useMemo, useState } from 'react'
import type { BuiltCollection } from '../data/buildCollection'
import type { Comparison, Id, Item } from '../domain/types'
import { DEFAULT_ELO_CONFIG, type EloConfig } from '../engine/elo'
import { generateRanking, type RankedItem } from '../engine/ranking'
import { randomPair } from '../engine/pairSelection'
import { replayComparisons } from '../engine/replay'

export interface RankedRow extends RankedItem {
  item: Item
  albumName: string
}

export interface RankingSession {
  /** The two items currently up for comparison. */
  pair: [Item, Item]
  /** Record that `winner` beat `loser`, then advance to a new pair. */
  choose: (winnerId: Id, loserId: Id) => void
  /** Skip the current pair without recording a result. */
  skip: () => void
  /** Undo the most recent choice and bring that pair back up. */
  undo: () => void
  canUndo: boolean
  /** Full leaderboard, best first, joined with item + album details. */
  ranking: RankedRow[]
  totalComparisons: number
  itemsById: Map<Id, Item>
}

/**
 * In-memory ranking session over a built collection. Ratings are derived by
 * replaying the comparison log, so state is always a pure function of that log —
 * which makes undo (and later, load-from-storage) trivial and correct. M5 will
 * back the comparison log with a repository without changing this surface.
 */
export function useRankingSession(
  collection: BuiltCollection,
  config: EloConfig = DEFAULT_ELO_CONFIG,
): RankingSession {
  const seedDate = collection.collection.createdDate

  const itemsById = useMemo(
    () => new Map(collection.items.map((i) => [i.id, i])),
    [collection.items],
  )
  const albumNameByGroupId = useMemo(
    () => new Map(collection.groups.map((g) => [g.id, g.name])),
    [collection.groups],
  )
  const itemIds = useMemo(
    () => collection.items.map((i) => i.id),
    [collection.items],
  )

  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [pair, setPair] = useState<[Item, Item]>(() =>
    randomPair(collection.items),
  )

  const ratings = useMemo(
    () => replayComparisons(itemIds, comparisons, seedDate, config),
    [itemIds, comparisons, seedDate, config],
  )

  const choose = useCallback(
    (winnerId: Id, loserId: Id) => {
      void loserId // loser is derived from the pair when replaying
      setComparisons((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          collectionId: collection.collection.id,
          itemAId: pair[0].id,
          itemBId: pair[1].id,
          winnerId,
          timestamp: new Date().toISOString(),
        },
      ])
      setPair(randomPair(collection.items))
    },
    [collection.collection.id, collection.items, pair],
  )

  const skip = useCallback(() => {
    setPair(randomPair(collection.items))
  }, [collection.items])

  const undo = useCallback(() => {
    if (comparisons.length === 0) return
    const last = comparisons[comparisons.length - 1]
    const a = itemsById.get(last.itemAId)
    const b = itemsById.get(last.itemBId)
    if (a && b) setPair([a, b]) // bring the undone pair back up to redo
    setComparisons((prev) => prev.slice(0, -1))
  }, [comparisons, itemsById])

  const ranking = useMemo<RankedRow[]>(() => {
    return generateRanking([...ratings.values()]).map((ranked) => {
      const item = itemsById.get(ranked.rating.itemId)!
      return {
        ...ranked,
        item,
        albumName: item.groupId
          ? (albumNameByGroupId.get(item.groupId) ?? '')
          : '',
      }
    })
  }, [ratings, itemsById, albumNameByGroupId])

  return {
    pair,
    choose,
    skip,
    undo,
    canUndo: comparisons.length > 0,
    ranking,
    totalComparisons: comparisons.length,
    itemsById,
  }
}
