import { useCallback, useMemo, useState } from 'react'
import type { BuiltCollection } from '../data/buildCollection'
import type { Comparison, Id, Item, Rating } from '../domain/types'
import {
  DEFAULT_ELO_CONFIG,
  initialRating,
  recordComparison,
  type EloConfig,
} from '../engine/elo'
import { generateRanking, type RankedItem } from '../engine/ranking'
import { randomPair } from '../engine/pairSelection'

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
  /** Full leaderboard, best first, joined with item + album details. */
  ranking: RankedRow[]
  totalComparisons: number
  itemsById: Map<Id, Item>
}

/**
 * In-memory ranking session over a built collection. Holds ratings and
 * comparison history in React state and derives the live leaderboard. M5 will
 * swap the in-memory maps for a persistence-backed repository without changing
 * this hook's surface.
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

  const [ratings, setRatings] = useState<Map<Id, Rating>>(
    () =>
      new Map(
        collection.items.map((i) => [i.id, initialRating(i.id, seedDate)]),
      ),
  )
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [pair, setPair] = useState<[Item, Item]>(() =>
    randomPair(collection.items),
  )

  const choose = useCallback(
    (winnerId: Id, loserId: Id) => {
      const timestamp = new Date().toISOString()
      setRatings((prev) => {
        const winner = prev.get(winnerId)
        const loser = prev.get(loserId)
        if (!winner || !loser) return prev
        const outcome = recordComparison(winner, loser, timestamp, config)
        const next = new Map(prev)
        next.set(winnerId, outcome.winner)
        next.set(loserId, outcome.loser)
        return next
      })
      setComparisons((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          collectionId: collection.collection.id,
          itemAId: pair[0].id,
          itemBId: pair[1].id,
          winnerId,
          timestamp,
        },
      ])
      setPair(randomPair(collection.items))
    },
    [collection.collection.id, collection.items, config, pair],
  )

  const skip = useCallback(() => {
    setPair(randomPair(collection.items))
  }, [collection.items])

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
    ranking,
    totalComparisons: comparisons.length,
    itemsById,
  }
}
