import { Fragment, useState } from 'react'
import type { Id } from '../domain/types'
import type { DatasetLabelSet, RankingsMode } from './RankingsView'

export type AlbumSort = 'mean' | 'topN'

export interface AlbumTrack {
  rank: number
  itemId: Id
  name: string
  score: number
  isBonus: boolean
  comparisonCount: number
}

export interface AlbumRow {
  rank: number
  groupId: Id
  name: string
  color: string
  year?: number
  meanScore: number
  meanInterval?: number
  topNScore: number
  topNInterval?: number
  songCount: number
}

interface AlbumsViewProps {
  mode: RankingsMode
  onModeChange: (mode: RankingsMode) => void
  includeBonus: boolean
  onIncludeBonusChange: (value: boolean) => void
  showBonusToggle: boolean
  sortBy: AlbumSort
  onSortChange: (sort: AlbumSort) => void
  topN: number
  albums: AlbumRow[]
  tracksByGroup: Map<Id, AlbumTrack[]>
  totalComparisons: number
  labels: DatasetLabelSet
}

export function AlbumsView({
  mode,
  onModeChange,
  includeBonus,
  onIncludeBonusChange,
  showBonusToggle,
  sortBy,
  onSortChange,
  topN,
  albums,
  tracksByGroup,
  totalComparisons,
  labels,
}: AlbumsViewProps) {
  const definitive = mode === 'definitive'
  const [expanded, setExpanded] = useState<Id | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Segmented
          options={[
            { value: 'live', label: 'Live (Elo)' },
            { value: 'definitive', label: 'Definitive (BT)' },
          ]}
          value={mode}
          onChange={(v) => onModeChange(v as RankingsMode)}
        />
        <Segmented
          options={[
            { value: 'mean', label: 'By mean' },
            { value: 'topN', label: `By top ${topN}` },
          ]}
          value={sortBy}
          onChange={(v) => onSortChange(v as AlbumSort)}
        />
        {showBonusToggle && (
          <label className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={includeBonus}
              onChange={(e) => onIncludeBonusChange(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            Include bonus {labels.itemPlural.toLowerCase()}
          </label>
        )}
      </div>

      {totalComparisons === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          No comparisons yet — rank some {labels.itemPlural.toLowerCase()} and
          the {labels.groupPlural.toLowerCase()} will follow.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {labels.groupPlural} scored purely from their{' '}
            {labels.itemPlural.toLowerCase()}. <strong>Mean</strong> rewards
            consistency; <strong>top {topN}</strong> rewards peaks. Click a{' '}
            {labels.group.toLowerCase()} to see its ranked{' '}
            {labels.itemPlural.toLowerCase()}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">{labels.group}</th>
                  <Th active={sortBy === 'mean'}>Mean</Th>
                  <Th active={sortBy === 'topN'}>Top {topN}</Th>
                  <th className="py-2 pl-2 text-right font-medium">
                    {labels.itemPlural}
                  </th>
                </tr>
              </thead>
              <tbody>
                {albums.map((album) => {
                  const isOpen = expanded === album.groupId
                  return (
                    <Fragment key={album.groupId}>
                      <tr
                        onClick={() =>
                          setExpanded(isOpen ? null : album.groupId)
                        }
                        aria-expanded={isOpen}
                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-2 pr-2 tabular-nums text-slate-500 dark:text-slate-400">
                          {album.rank}
                        </td>
                        <td className="py-2 pr-2 font-medium text-slate-900 dark:text-slate-100">
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-400">
                              {isOpen ? '▾' : '▸'}
                            </span>
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: album.color }}
                            />
                            {album.name}
                            {album.year ? (
                              <span className="text-slate-500 dark:text-slate-400">
                                ({album.year})
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <ScoreCell
                          score={album.meanScore}
                          interval={definitive ? album.meanInterval : undefined}
                          emphasised={sortBy === 'mean'}
                        />
                        <ScoreCell
                          score={album.topNScore}
                          interval={definitive ? album.topNInterval : undefined}
                          emphasised={sortBy === 'topN'}
                        />
                        <td className="py-2 pl-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          {album.songCount}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <td
                            colSpan={5}
                            className="bg-slate-50 dark:bg-slate-900/40"
                          >
                            <TrackList
                              tracks={tracksByGroup.get(album.groupId) ?? []}
                              color={album.color}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TrackList({ tracks, color }: { tracks: AlbumTrack[]; color: string }) {
  return (
    <ol className="flex flex-col gap-0.5 py-2 pl-8 pr-3">
      {tracks.map((track) => (
        <li
          key={track.itemId}
          className="flex items-center gap-2 py-0.5 text-sm"
        >
          <span className="w-5 shrink-0 text-right tabular-nums text-slate-500 dark:text-slate-400">
            {track.rank}
          </span>
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-slate-800 dark:text-slate-200">
            {track.name}
          </span>
          {track.isBonus ? (
            <span className="rounded bg-slate-200 px-1 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              bonus
            </span>
          ) : null}
          {track.comparisonCount === 0 ? (
            <span className="text-xs text-slate-400">· unranked</span>
          ) : null}
          <span className="ml-auto tabular-nums text-slate-500 dark:text-slate-400">
            {Math.round(track.score)}
          </span>
        </li>
      ))}
    </ol>
  )
}

function Th({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <th
      className={
        'py-2 pr-2 text-right font-medium ' +
        (active ? 'text-slate-600 dark:text-slate-300' : '')
      }
    >
      {children}
    </th>
  )
}

function ScoreCell({
  score,
  interval,
  emphasised,
}: {
  score: number
  interval?: number
  emphasised: boolean
}) {
  return (
    <td
      className={
        'py-2 pr-2 text-right tabular-nums ' +
        (emphasised
          ? 'font-semibold text-slate-900 dark:text-slate-100'
          : 'text-slate-600 dark:text-slate-400')
      }
    >
      {Math.round(score)}
      {interval !== undefined ? (
        <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
          ±{Math.round(interval)}
        </span>
      ) : null}
    </td>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-current={value === opt.value}
          className={
            'rounded-md px-3 py-1 font-medium transition ' +
            (value === opt.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
