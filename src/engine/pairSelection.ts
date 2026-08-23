import type {
  Comparison,
  Id,
  Item,
  PairSelectionWeights,
  Rating,
} from '../domain/types'

// Pair selection. The selector reads ratings but never updates them, so it stays
// independent of the ranking algorithm. Strategies are combined by configurable
// weights; a single call picks one strategy then produces a pair from it.

export type SelectionStrategy =
  'similarRating' | 'lowConfidence' | 'random' | 'verification'

export interface PairSelectionContext {
  items: readonly Item[]
  ratings: Map<Id, Rating>
  comparisons: readonly Comparison[]
  weights: PairSelectionWeights
  /** Unordered key of the current pair, to avoid presenting it twice in a row. */
  avoidPairKey?: string
}

/** How many nearest-by-score items form the pool a "similar" opponent is drawn from. */
const NEAREST_POOL = 6
/** How many lowest-confidence items form the pool a low-confidence anchor is drawn from. */
const LOW_CONFIDENCE_POOL = 12

/** Unordered, stable key for a pair of item ids. */
export function pairKey(a: Id, b: Id): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Pick two distinct items uniformly at random. The random source is injectable
 * so callers (and tests) can make it deterministic.
 */
export function randomPair<T>(
  items: readonly T[],
  random: () => number = Math.random,
): [T, T] {
  if (items.length < 2) {
    throw new Error('Need at least two items to form a pair')
  }
  const i = Math.floor(random() * items.length)
  // Pick j in [0, n-1) then skip past i, guaranteeing j !== i with uniform odds.
  let j = Math.floor(random() * (items.length - 1))
  if (j >= i) j++
  return [items[i], items[j]]
}

/** Weighted choice of strategy. Non-positive weights are ignored. */
export function chooseStrategy(
  weights: PairSelectionWeights,
  random: () => number = Math.random,
): SelectionStrategy {
  const entries: [SelectionStrategy, number][] = [
    ['similarRating', weights.similarRating],
    ['lowConfidence', weights.lowConfidence],
    ['random', weights.random],
    ['verification', weights.verification],
  ]
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0)
  if (total <= 0) return 'random'

  let r = random() * total
  for (const [name, w] of entries) {
    r -= Math.max(0, w)
    if (r < 0) return name
  }
  return 'random'
}

const scoreOf = (id: Id, ratings: Map<Id, Rating>) =>
  ratings.get(id)?.score ?? 0
const confidenceOf = (id: Id, ratings: Map<Id, Rating>) =>
  ratings.get(id)?.confidence ?? 0

function pickRandom<T>(arr: readonly T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)]
}

/** The `k` items whose score is closest to the anchor's (excluding the anchor). */
export function kNearestByScore(
  anchorId: Id,
  items: readonly Item[],
  ratings: Map<Id, Rating>,
  k: number,
): Item[] {
  const anchorScore = scoreOf(anchorId, ratings)
  return [...items]
    .filter((i) => i.id !== anchorId)
    .sort(
      (a, b) =>
        Math.abs(scoreOf(a.id, ratings) - anchorScore) -
          Math.abs(scoreOf(b.id, ratings) - anchorScore) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, Math.max(0, k))
}

function nearestOpponent(
  anchor: Item,
  ctx: PairSelectionContext,
  random: () => number,
): Item {
  const pool = kNearestByScore(anchor.id, ctx.items, ctx.ratings, NEAREST_POOL)
  return pool.length > 0 ? pickRandom(pool, random) : anchor
}

function similarRatingPair(
  ctx: PairSelectionContext,
  random: () => number,
): [Item, Item] {
  const anchor = pickRandom(ctx.items, random)
  return [anchor, nearestOpponent(anchor, ctx, random)]
}

function lowConfidencePair(
  ctx: PairSelectionContext,
  random: () => number,
): [Item, Item] {
  const pool = [...ctx.items]
    .sort(
      (a, b) =>
        confidenceOf(a.id, ctx.ratings) - confidenceOf(b.id, ctx.ratings) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, Math.min(LOW_CONFIDENCE_POOL, ctx.items.length))
  const anchor = pickRandom(pool, random)
  return [anchor, nearestOpponent(anchor, ctx, random)]
}

function verificationPair(
  ctx: PairSelectionContext,
  random: () => number,
): [Item, Item] | null {
  if (ctx.comparisons.length === 0) return null
  const byId = new Map(ctx.items.map((i) => [i.id, i]))
  for (let attempt = 0; attempt < 8; attempt++) {
    const c = pickRandom(ctx.comparisons, random)
    const a = byId.get(c.itemAId)
    const b = byId.get(c.itemBId)
    if (a && b) return [a, b]
  }
  return null
}

/**
 * Select the next pair by weighted strategy. Guarantees two distinct items and,
 * where possible, avoids immediately repeating the current pair.
 */
export function selectPair(
  ctx: PairSelectionContext,
  random: () => number = Math.random,
): [Item, Item] {
  if (ctx.items.length < 2) {
    throw new Error('Need at least two items to form a pair')
  }

  const build = (): [Item, Item] => {
    switch (chooseStrategy(ctx.weights, random)) {
      case 'similarRating':
        return similarRatingPair(ctx, random)
      case 'lowConfidence':
        return lowConfidencePair(ctx, random)
      case 'verification':
        return verificationPair(ctx, random) ?? randomPair(ctx.items, random)
      case 'random':
      default:
        return randomPair(ctx.items, random)
    }
  }

  let pair = build()
  for (
    let attempt = 0;
    attempt < 8 &&
    ctx.avoidPairKey &&
    pairKey(pair[0].id, pair[1].id) === ctx.avoidPairKey;
    attempt++
  ) {
    pair = build()
  }
  return pair
}
