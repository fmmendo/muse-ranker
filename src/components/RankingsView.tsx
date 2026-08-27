import type { Item } from '../domain/types'
import type { RankedRow } from '../session/useRankingSession'

export type RankingsMode = 'live' | 'definitive'

export interface DatasetLabelSet {
  /** Singular item label, e.g. "Song". */
  item: string
  /** Singular group label, e.g. "Album". */
  group: string
  /** Plural item label, e.g. "Songs". */
  itemPlural: string
  /** Plural group label, e.g. "Albums". */
  groupPlural: string
}

export interface DefinitiveRow {
  rank: number
  item: Item
  groupName: string
  groupColor: string
  score: number
  /** ± half-width of the 95% interval, in score points. */
  interval: number
  comparisonCount: number
  /** True if this item's interval overlaps the item ranked above it. */
  tie: boolean
}

interface RankingsViewProps {
  mode: RankingsMode
  onModeChange: (mode: RankingsMode) => void
  liveRanking: RankedRow[]
  definitiveRanking: DefinitiveRow[]
  unrankedCount: number
  totalComparisons: number
  labels: DatasetLabelSet
}

export function RankingsView({
  mode,
  onModeChange,
  liveRanking,
  definitiveRanking,
  unrankedCount,
  totalComparisons,
  labels,
}: RankingsViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
          <ModeButton
            active={mode === 'live'}
            onClick={() => onModeChange('live')}
          >
            Live (Elo)
          </ModeButton>
          <ModeButton
            active={mode === 'definitive'}
            onClick={() => onModeChange('definitive')}
          >
            Definitive (Bradley–Terry)
          </ModeButton>
        </div>
      </div>

      {totalComparisons === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          No comparisons yet — head to Compare and start picking.
        </p>
      ) : mode === 'live' ? (
        <LiveTable ranking={liveRanking} labels={labels} />
      ) : (
        <DefinitiveTable
          ranking={definitiveRanking}
          unrankedCount={unrankedCount}
          labels={labels}
        />
      )}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      className={
        'rounded-md px-3 py-1 font-medium transition ' +
        (active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')
      }
    >
      {children}
    </button>
  )
}

function LiveTable({
  ranking,
  labels,
}: {
  ranking: RankedRow[]
  labels: DatasetLabelSet
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-400 dark:border-slate-700">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">{labels.item}</th>
            <th className="py-2 pr-2 font-medium">{labels.group}</th>
            <th className="py-2 pr-2 text-right font-medium">Score</th>
            <th className="py-2 pr-2 text-right font-medium">W–L</th>
            <th className="py-2 pl-2 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map(({ rank, rating, item, groupName, groupColor }) => (
            <tr
              key={rating.itemId}
              className="border-b border-slate-100 dark:border-slate-800"
            >
              <td className="py-2 pr-2 tabular-nums text-slate-400">{rank}</td>
              <td className="py-2 pr-2 font-medium text-slate-900 dark:text-slate-100">
                {item.name}
              </td>
              <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">
                <GroupCell name={groupName} color={groupColor} />
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                {Math.round(rating.score)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                {rating.wins}–{rating.losses}
              </td>
              <td className="py-2 pl-2">
                <ConfidenceBar value={rating.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DefinitiveTable({
  ranking,
  unrankedCount,
  labels,
}: {
  ranking: DefinitiveRow[]
  unrankedCount: number
  labels: DatasetLabelSet
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-xs text-slate-400">
        Order-independent fit over all comparisons. ± is the 95% interval;
        overlapping intervals (≈) mean a statistical tie.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-400 dark:border-slate-700">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">{labels.item}</th>
              <th className="py-2 pr-2 font-medium">{labels.group}</th>
              <th className="py-2 pr-2 text-right font-medium">Score</th>
              <th className="py-2 pr-2 text-right font-medium">95% CI</th>
              <th className="py-2 pr-2 text-right font-medium">n</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row) => (
              <tr
                key={row.item.id}
                className="border-b border-slate-100 dark:border-slate-800"
              >
                <td className="py-2 pr-2 tabular-nums text-slate-400">
                  {row.tie ? (
                    <span title="Statistical tie with the item above">
                      ≈{row.rank}
                    </span>
                  ) : (
                    row.rank
                  )}
                </td>
                <td className="py-2 pr-2 font-medium text-slate-900 dark:text-slate-100">
                  {row.item.name}
                </td>
                <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">
                  <GroupCell name={row.groupName} color={row.groupColor} />
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                  {Math.round(row.score)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-400">
                  ±{Math.round(row.interval)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-slate-400">
                  {row.comparisonCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unrankedCount > 0 && (
        <p className="text-center text-xs text-slate-400">
          {unrankedCount}{' '}
          {unrankedCount === 1 ? labels.item : labels.itemPlural} not yet
          compared.
        </p>
      )}
    </div>
  )
}

function GroupCell({ name, color }: { name: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div
      className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
      title={`${Math.round(value * 100)}% confidence`}
    >
      <div
        className="h-full rounded-full bg-indigo-500"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}
