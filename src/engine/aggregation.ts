import type { Id } from '../domain/types'

// Aggregate item scores up to their groups (e.g. songs → albums). Domain-
// agnostic: it knows nothing about "albums", only groups of scored members.
//
// Two methods are provided side by side because they answer different questions:
//   mean  → rewards consistency (an album with no filler)
//   top-N → rewards peaks (an album with a few untouchable bangers)
//
// When members carry a 95% interval, it is propagated to the aggregate assuming
// independence: interval(mean) = sqrt(Σ intervalᵢ²) / k. This is an approximation
// (the underlying estimates are mildly correlated) consistent with the diagonal
// approximation already used for per-item intervals.

export interface ScoredMember {
  score: number
  /** 95% half-interval for this member's score, if known. */
  interval95?: number
}

export interface Aggregate {
  score: number
  interval95?: number
  /** Number of members that went into this aggregate. */
  count: number
}

function propagateInterval(members: ScoredMember[]): number | undefined {
  if (members.length === 0) return undefined
  if (members.some((m) => m.interval95 === undefined)) return undefined
  const sumSq = members.reduce((s, m) => s + m.interval95! * m.interval95!, 0)
  return Math.sqrt(sumSq) / members.length
}

export function meanAggregate(members: ScoredMember[]): Aggregate {
  if (members.length === 0) return { score: 0, count: 0 }
  const score = members.reduce((s, m) => s + m.score, 0) / members.length
  return {
    score,
    interval95: propagateInterval(members),
    count: members.length,
  }
}

export function topNAggregate(members: ScoredMember[], n: number): Aggregate {
  if (members.length === 0) return { score: 0, count: 0 }
  const top = [...members]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(n, members.length))
  const score = top.reduce((s, m) => s + m.score, 0) / top.length
  return { score, interval95: propagateInterval(top), count: top.length }
}

export interface GroupMember extends ScoredMember {
  groupId: Id
  /** When true the member is excluded from aggregation (e.g. a bonus track). */
  excluded?: boolean
}

export interface GroupAggregate {
  groupId: Id
  mean: Aggregate
  topN: Aggregate
}

/** Group members by groupId (dropping excluded ones) and aggregate each group. */
export function aggregateByGroup(
  members: GroupMember[],
  topN: number,
): GroupAggregate[] {
  const byGroup = new Map<Id, ScoredMember[]>()
  for (const m of members) {
    if (m.excluded) continue
    const list = byGroup.get(m.groupId) ?? []
    list.push({ score: m.score, interval95: m.interval95 })
    byGroup.set(m.groupId, list)
  }
  return [...byGroup.entries()].map(([groupId, list]) => ({
    groupId,
    mean: meanAggregate(list),
    topN: topNAggregate(list, topN),
  }))
}
