import { albumColor } from '../data/albumColors'
import type { RankedRow } from '../session/useRankingSession'

interface RankingsViewProps {
  ranking: RankedRow[]
  totalComparisons: number
}

export function RankingsView({ ranking, totalComparisons }: RankingsViewProps) {
  if (totalComparisons === 0) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400">
        No comparisons yet — head to Compare and start picking.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-400 dark:border-slate-700">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Song</th>
            <th className="py-2 pr-2 font-medium">Album</th>
            <th className="py-2 pr-2 text-right font-medium">Score</th>
            <th className="py-2 pr-2 text-right font-medium">W–L</th>
            <th className="py-2 pl-2 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map(({ rank, rating, item, albumName }) => (
            <tr
              key={rating.itemId}
              className="border-b border-slate-100 dark:border-slate-800"
            >
              <td className="py-2 pr-2 tabular-nums text-slate-400">{rank}</td>
              <td className="py-2 pr-2 font-medium text-slate-900 dark:text-slate-100">
                {item.name}
              </td>
              <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: albumColor(albumName) }}
                  />
                  {albumName}
                </span>
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
