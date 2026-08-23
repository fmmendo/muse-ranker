import type { Stats } from '../engine/stats'

interface StatsViewProps {
  stats: Stats
}

export function StatsView({ stats }: StatsViewProps) {
  if (stats.totalComparisons === 0) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400">
        No comparisons yet — stats will appear as you rank.
      </p>
    )
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Comparisons" value={stats.totalComparisons.toString()} />
        <Tile
          label="Songs covered"
          value={`${stats.songsCompared}/${stats.totalSongs}`}
          hint={pct(stats.coverage)}
        />
        <Tile label="Mean confidence" value={pct(stats.meanConfidence)} />
        <Tile
          label="Well-ranked"
          value={`${stats.wellRankedCount}/${stats.totalSongs}`}
          hint="≥8 comparisons"
        />
        <Tile
          label="Est. remaining"
          value={stats.estimatedRemaining.toString()}
          hint="to settle all"
        />
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Confidence distribution
        </h3>
        <ConfidenceHistogram
          buckets={stats.confidenceBuckets}
          total={stats.totalSongs}
        />
      </section>

      <p className="text-xs text-slate-400">
        Convergence rises as low-confidence songs get surfaced for more
        comparisons. “Est. remaining” assumes ~8 comparisons per song.
      </p>
    </div>
  )
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {hint ? <div className="text-xs text-slate-400">{hint}</div> : null}
    </div>
  )
}

function ConfidenceHistogram({
  buckets,
  total,
}: {
  buckets: Stats['confidenceBuckets']
  total: number
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <div className="flex flex-col gap-1.5">
      {buckets.map((b) => (
        <div key={b.label} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 text-right text-slate-400">
            {b.label}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded bg-indigo-500"
              style={{ width: `${(b.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
            {b.count}
          </span>
        </div>
      ))}
      <span className="sr-only">{total} songs total</span>
    </div>
  )
}
