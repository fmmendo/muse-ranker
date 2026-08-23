// Pair selection. For now this is pure random selection; M6 will extend this
// with confidence-based, similar-rating and verification strategies behind a
// weighting. Kept separate from the ranking engine so the two evolve
// independently (the selector may read ratings, but never updates them).

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
