import type { Comparison, Id } from '../domain/types'

// Bradley-Terry model, fit by maximum likelihood (MM / Zermelo iteration).
//
// Each item i has a strength p_i > 0; P(i beats j) = p_i / (p_i + p_j). Given the
// full comparison log we find the strengths that best explain all results at
// once. Unlike Elo this is ORDER-INDEPENDENT and yields standard errors, so it's
// the "definitive" ranking with real confidence intervals.
//
// A weak symmetric prior (virtual wins+losses against a mean opponent) is added
// so the estimate always exists and is finite — plain BT MLE diverges to ±∞ for
// an item that never wins or never loses, and requires a fully connected
// comparison graph. The prior also gives sensible, wide intervals when data is
// thin, shrinking as real comparisons accumulate.

/** Elo-points per unit of log-strength, so BT scores share Elo's familiar scale. */
const ELO_SCALE = 400 / Math.LN10 // ≈ 173.72
const Z_95 = 1.959964

export interface BradleyTerryOptions {
  /** Virtual wins (and losses) vs a mean opponent, per item. Default 0.5. */
  prior?: number
  maxIterations?: number
  tolerance?: number
}

export interface BradleyTerryItemResult {
  itemId: Id
  strength: number
  logStrength: number
  /** Elo-scaled score (1000-centred), directly comparable to the live Elo score. */
  score: number
  /** Standard error of the log-strength (diagonal Fisher-information approx). */
  stdError: number
  /** 95% half-interval on the Elo scale (±). */
  interval95: number
  comparisonCount: number
}

export interface BradleyTerryFit {
  results: BradleyTerryItemResult[]
  iterations: number
  converged: boolean
}

export function fitBradleyTerry(
  itemIds: readonly Id[],
  comparisons: readonly Comparison[],
  options: BradleyTerryOptions = {},
): BradleyTerryFit {
  const prior = options.prior ?? 0.5
  const maxIterations = options.maxIterations ?? 1000
  const tolerance = options.tolerance ?? 1e-9

  const ids = [...itemIds]
  const n = ids.length
  const index = new Map(ids.map((id, k) => [id, k]))

  const wins = new Float64Array(n)
  const neighbors: Map<number, number>[] = ids.map(() => new Map())

  for (const c of comparisons) {
    const wi = index.get(c.winnerId)
    const loserId = c.winnerId === c.itemAId ? c.itemBId : c.itemAId
    const li = index.get(loserId)
    if (wi === undefined || li === undefined) continue
    wins[wi] += 1
    neighbors[wi].set(li, (neighbors[wi].get(li) ?? 0) + 1)
    neighbors[li].set(wi, (neighbors[li].get(wi) ?? 0) + 1)
  }

  let p = new Float64Array(n).fill(1)
  let iterations = 0
  let converged = false

  while (iterations < maxIterations) {
    const next = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      let denom = (2 * prior) / (p[i] + 1) // virtual opponent (strength 1)
      for (const [j, nij] of neighbors[i]) {
        denom += nij / (p[i] + p[j])
      }
      next[i] = (wins[i] + prior) / denom
    }

    // Normalise to geometric mean 1 to fix the scale.
    let logSum = 0
    for (let i = 0; i < n; i++) logSum += Math.log(next[i])
    const gm = Math.exp(logSum / n)

    let maxDelta = 0
    for (let i = 0; i < n; i++) {
      next[i] /= gm
      maxDelta = Math.max(maxDelta, Math.abs(next[i] - p[i]))
    }
    p = next
    iterations++
    if (maxDelta < tolerance) {
      converged = true
      break
    }
  }

  const results: BradleyTerryItemResult[] = ids.map((id, i) => {
    // Diagonal of the observed Fisher information for β_i = ln(p_i).
    let info = 0
    let count = 0
    for (const [j, nij] of neighbors[i]) {
      const s = p[i] + p[j]
      info += (nij * (p[i] * p[j])) / (s * s)
      count += nij
    }
    const sp = p[i] + 1
    info += (2 * prior * (p[i] * 1)) / (sp * sp) // prior's information

    const stdError = info > 0 ? Math.sqrt(1 / info) : Infinity
    const logStrength = Math.log(p[i])
    return {
      itemId: id,
      strength: p[i],
      logStrength,
      score: 1000 + ELO_SCALE * logStrength,
      stdError,
      interval95: Z_95 * ELO_SCALE * stdError,
      comparisonCount: count,
    }
  })

  return { results, iterations, converged }
}
