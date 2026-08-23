import { useMemo, useState } from 'react'
import { muse } from './data/muse'
import { useRankingSession } from './session/useRankingSession'
import { CompareView } from './components/CompareView'
import {
  RankingsView,
  type DefinitiveRow,
  type RankingsMode,
} from './components/RankingsView'
import {
  AlbumsView,
  type AlbumRow,
  type AlbumSort,
} from './components/AlbumsView'
import { StatsView } from './components/StatsView'
import { albumColor } from './data/albumColors'
import { getModel } from './engine/model'
import { aggregateByGroup, type GroupMember } from './engine/aggregation'
import { computeStats } from './engine/stats'
import type { RankerRepository } from './data/repository'
import type { Item } from './domain/types'

type Tab = 'compare' | 'rankings' | 'albums' | 'stats'

const ALBUM_TOP_N = 3

interface AppProps {
  /** Injectable for tests/previews; defaults to the Dexie-backed repository. */
  repository?: RankerRepository
}

function App({ repository }: AppProps = {}) {
  const session = useRankingSession(muse, undefined, repository)
  const [tab, setTab] = useState<Tab>('compare')
  const [rankMode, setRankMode] = useState<RankingsMode>('live')
  const [albumMode, setAlbumMode] = useState<RankingsMode>('live')
  const [albumSort, setAlbumSort] = useState<AlbumSort>('mean')
  const [includeBonus, setIncludeBonus] = useState(false)

  const albumNameByGroupId = useMemo(
    () => new Map(muse.groups.map((g) => [g.id, g.name])),
    [],
  )

  const groupInfoById = useMemo(
    () =>
      new Map(
        muse.groups.map((g) => [
          g.id,
          { name: g.name, year: g.metadata?.year as number | undefined },
        ]),
      ),
    [],
  )

  const albumNameOf = (item: Item): string =>
    item.groupId ? (albumNameByGroupId.get(item.groupId) ?? '') : ''

  const albumLabel = (item: Item): string => {
    const album = albumNameOf(item)
    const year = item.metadata?.year
    return year ? `${album} · ${year}` : album
  }

  const albumColorOf = (item: Item): string => albumColor(albumNameOf(item))

  // The Bradley-Terry fit is only computed when the definitive view is showing.
  const definitive = useMemo(() => {
    if (rankMode !== 'definitive') {
      return { rows: [] as DefinitiveRow[], unranked: 0 }
    }
    const results = getModel('bradley-terry').rank(
      muse.items.map((i) => i.id),
      session.comparisons,
    )
    const rated = results
      .filter((r) => r.comparisonCount > 0)
      .sort((a, b) => b.score - a.score)

    const rows: DefinitiveRow[] = rated.map((r, idx) => {
      const item = session.itemsById.get(r.itemId)!
      const interval = r.interval95 ?? 0
      const prev = idx > 0 ? rated[idx - 1] : null
      const tie = prev
        ? prev.score - (prev.interval95 ?? 0) <= r.score + interval
        : false
      return {
        rank: idx + 1,
        item,
        albumName: item.groupId
          ? (albumNameByGroupId.get(item.groupId) ?? '')
          : '',
        score: r.score,
        interval,
        comparisonCount: r.comparisonCount,
        tie,
      }
    })
    return { rows, unranked: muse.items.length - rated.length }
  }, [rankMode, session.comparisons, session.itemsById, albumNameByGroupId])

  // Album aggregation (only computed while the Albums tab is showing).
  const albums = useMemo<AlbumRow[]>(() => {
    if (tab !== 'albums') return []

    const model = albumMode === 'definitive' ? 'bradley-terry' : 'elo'
    const results = getModel(model).rank(
      muse.items.map((i) => i.id),
      session.comparisons,
    )
    const members: GroupMember[] = results.map((r) => {
      const item = session.itemsById.get(r.itemId)!
      return {
        groupId: item.groupId ?? '',
        score: r.score,
        interval95: r.interval95,
        excluded: !includeBonus && item.metadata?.isBonus === true,
      }
    })

    const aggregates = aggregateByGroup(members, ALBUM_TOP_N)
    const rows = aggregates.map((g) => {
      const info = groupInfoById.get(g.groupId)
      return {
        groupId: g.groupId,
        name: info?.name ?? '',
        year: info?.year,
        meanScore: g.mean.score,
        meanInterval: g.mean.interval95,
        topNScore: g.topN.score,
        topNInterval: g.topN.interval95,
        songCount: g.mean.count,
      }
    })

    const key = albumSort === 'mean' ? 'meanScore' : 'topNScore'
    rows.sort((a, b) => b[key] - a[key])
    return rows.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [
    tab,
    albumMode,
    albumSort,
    includeBonus,
    session.comparisons,
    session.itemsById,
    groupInfoById,
  ])

  const stats = useMemo(() => {
    if (tab !== 'stats') return null
    return computeStats(
      session.ranking.map((row) => row.rating),
      session.totalComparisons,
    )
  }, [tab, session.ranking, session.totalComparisons])

  const comparisonLabel = `${session.totalComparisons} comparison${
    session.totalComparisons === 1 ? '' : 's'
  }`

  const handleReset = () => {
    if (
      window.confirm(
        `Clear all ${session.totalComparisons} comparisons for ${muse.collection.name}? This cannot be undone.`,
      )
    ) {
      session.reset()
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-6 py-10 text-slate-900 dark:text-slate-100">
      <header className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Preference Ranker
          </h1>
          <span className="flex items-center gap-3 text-sm text-slate-400">
            <span>
              {muse.collection.name} · {comparisonLabel}
            </span>
            {session.totalComparisons > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="underline-offset-4 transition hover:text-rose-500 hover:underline"
              >
                Reset
              </button>
            )}
          </span>
        </div>

        <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <TabButton
            active={tab === 'compare'}
            onClick={() => setTab('compare')}
          >
            Compare
          </TabButton>
          <TabButton
            active={tab === 'rankings'}
            onClick={() => setTab('rankings')}
          >
            Rankings
          </TabButton>
          <TabButton active={tab === 'albums'} onClick={() => setTab('albums')}>
            Albums
          </TabButton>
          <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>
            Stats
          </TabButton>
        </nav>
      </header>

      {!session.loaded ? (
        <p className="text-center text-slate-400">Loading…</p>
      ) : tab === 'compare' ? (
        <CompareView
          pair={session.pair}
          onChoose={session.choose}
          onSkip={session.skip}
          onUndo={session.undo}
          canUndo={session.canUndo}
          albumLabel={albumLabel}
          albumColor={albumColorOf}
        />
      ) : tab === 'rankings' ? (
        <RankingsView
          mode={rankMode}
          onModeChange={setRankMode}
          liveRanking={session.ranking}
          definitiveRanking={definitive.rows}
          unrankedCount={definitive.unranked}
          totalComparisons={session.totalComparisons}
        />
      ) : tab === 'albums' ? (
        <AlbumsView
          mode={albumMode}
          onModeChange={setAlbumMode}
          includeBonus={includeBonus}
          onIncludeBonusChange={setIncludeBonus}
          sortBy={albumSort}
          onSortChange={setAlbumSort}
          topN={ALBUM_TOP_N}
          albums={albums}
          totalComparisons={session.totalComparisons}
        />
      ) : (
        stats && <StatsView stats={stats} />
      )}
    </main>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      className={
        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ' +
        (active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')
      }
    >
      {children}
    </button>
  )
}

export default App
