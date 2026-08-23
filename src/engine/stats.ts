import type { Rating } from '../domain/types'

// Session statistics, computed purely from the current ratings + comparison
// count. Framework-free and deterministic.

/** Comparisons a song needs before we consider it reasonably settled. */
export const WELL_RANKED_THRESHOLD = 8
/** Target comparisons per song used for the "remaining" estimate. */
export const TARGET_PER_SONG = 8

export interface ConfidenceBucket {
  label: string
  count: number
}

export interface Stats {
  totalComparisons: number
  totalSongs: number
  songsCompared: number
  /** Fraction of songs with at least one comparison, 0..1. */
  coverage: number
  /** Mean per-song confidence, 0..1. */
  meanConfidence: number
  /** Songs with at least WELL_RANKED_THRESHOLD comparisons. */
  wellRankedCount: number
  /**
   * Heuristic comparisons still needed to bring every song up to
   * TARGET_PER_SONG comparisons (each comparison advances two songs).
   */
  estimatedRemaining: number
  /** Distribution of songs across five confidence bands. */
  confidenceBuckets: ConfidenceBucket[]
}

const BUCKET_BOUNDS = [0.2, 0.4, 0.6, 0.8, 1.0001]
const BUCKET_LABELS = ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%']

function bucketize(ratings: Rating[]): ConfidenceBucket[] {
  const counts = new Array(BUCKET_BOUNDS.length).fill(0)
  for (const r of ratings) {
    const idx = BUCKET_BOUNDS.findIndex((b) => r.confidence < b)
    counts[idx === -1 ? BUCKET_BOUNDS.length - 1 : idx] += 1
  }
  return BUCKET_LABELS.map((label, i) => ({ label, count: counts[i] }))
}

export function computeStats(
  ratings: Rating[],
  totalComparisons: number,
): Stats {
  const totalSongs = ratings.length
  const songsCompared = ratings.filter((r) => r.comparisonCount > 0).length
  const meanConfidence =
    totalSongs === 0
      ? 0
      : ratings.reduce((s, r) => s + r.confidence, 0) / totalSongs
  const wellRankedCount = ratings.filter(
    (r) => r.comparisonCount >= WELL_RANKED_THRESHOLD,
  ).length
  const deficit = ratings.reduce(
    (s, r) => s + Math.max(0, TARGET_PER_SONG - r.comparisonCount),
    0,
  )

  return {
    totalComparisons,
    totalSongs,
    songsCompared,
    coverage: totalSongs === 0 ? 0 : songsCompared / totalSongs,
    meanConfidence,
    wellRankedCount,
    estimatedRemaining: Math.ceil(deficit / 2),
    confidenceBuckets: bucketize(ratings),
  }
}
