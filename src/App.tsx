import { useEffect, useMemo, useState } from 'react'
import { useRankingSession } from './session/useRankingSession'
import { CompareView } from './components/CompareView'
import {
  RankingsView,
  type DatasetLabelSet,
  type DefinitiveRow,
  type RankingsMode,
} from './components/RankingsView'
import {
  AlbumsView,
  type AlbumRow,
  type AlbumSort,
  type AlbumTrack,
} from './components/AlbumsView'
import { StatsView } from './components/StatsView'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './session/useTheme'
import { colorFor } from './data/colors'
import { getModel } from './engine/model'
import { aggregateByGroup, type GroupMember } from './engine/aggregation'
import { computeStats } from './engine/stats'
import { loadCollection } from './data/loadCollection'
import type { BuiltCollection } from './data/buildCollection'
import type { RankerRepository } from './data/repository'
import type { Group, Item } from './domain/types'

type Tab = 'compare' | 'rankings' | 'albums' | 'stats'

const ALBUM_TOP_N = 3

interface AppProps {
  /** Injectable for tests/previews; defaults to the Dexie-backed repository. */
  repository?: RankerRepository
  /** Injectable collection; when omitted it is fetched from the dataset URL. */
  collection?: BuiltCollection
}

/** Loads the dataset (unless injected), then renders the app. */
function App({ repository, collection: injected }: AppProps = {}) {
  const [collection, setCollection] = useState<BuiltCollection | null>(
    injected ?? null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (injected) return
    let cancelled = false
    loadCollection()
      .then((c) => {
        if (!cancelled) setCollection(c)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [injected])

  if (error) {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-2 px-6 text-center text-slate-900 dark:text-slate-100">
        <h1 className="text-xl font-semibold">Couldn’t load the dataset</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
      </main>
    )
  }
  if (!collection) {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl items-center justify-center px-6 text-slate-500 dark:text-slate-400">
        Loading…
      </main>
    )
  }
  return <RankerApp collection={collection} repository={repository} />
}

function RankerApp({
  collection,
  repository,
}: {
  collection: BuiltCollection
  repository?: RankerRepository
}) {
  const session = useRankingSession(collection, undefined, repository)
  const { theme, cycle } = useTheme()
  const [tab, setTab] = useState<Tab>('compare')
  const [rankMode, setRankMode] = useState<RankingsMode>('live')
  const [albumMode, setAlbumMode] = useState<RankingsMode>('live')
  const [albumSort, setAlbumSort] = useState<AlbumSort>('mean')
  const [includeBonus, setIncludeBonus] = useState(false)

  const groupById = useMemo(
    () => new Map(collection.groups.map((g) => [g.id, g])),
    [collection.groups],
  )

  const meta = collection.collection
  const labels: DatasetLabelSet = useMemo(() => {
    const plural = (singular: string | undefined, fallback: string) =>
      singular ? `${singular}s` : fallback
    return {
      group: meta.groupLabel ?? 'Group',
      groupPlural: meta.groupLabelPlural ?? plural(meta.groupLabel, 'Groups'),
      item: meta.itemLabel ?? 'Item',
      itemPlural: meta.itemLabelPlural ?? plural(meta.itemLabel, 'Items'),
    }
  }, [meta])

  const hasBonus = useMemo(
    () => collection.items.some((i) => i.metadata?.isBonus === true),
    [collection.items],
  )

  const groupOf = (item: Item): Group | undefined =>
    item.groupId ? groupById.get(item.groupId) : undefined

  const compareLabel = (item: Item): string => {
    const group = groupOf(item)
    if (!group) return ''
    const year = group.metadata?.year
    return year ? `${group.name} · ${year}` : group.name
  }

  const colorOf = (item: Item): string => {
    const group = groupOf(item)
    return group ? colorFor(group.name, group.color) : colorFor('')
  }

  // Bradley-Terry definitive ranking (only while the definitive view shows).
  const definitive = useMemo(() => {
    if (rankMode !== 'definitive') {
      return { rows: [] as DefinitiveRow[], unranked: 0 }
    }
    const results = getModel('bradley-terry')
      .rank(
        collection.items.map((i) => i.id),
        session.comparisons,
      )
      .filter((r) => r.comparisonCount > 0)
      .sort((a, b) => b.score - a.score)

    const rows: DefinitiveRow[] = results.map((r, idx) => {
      const item = session.itemsById.get(r.itemId)!
      const group = groupOf(item)
      const interval = r.interval95 ?? 0
      const prev = idx > 0 ? results[idx - 1] : null
      const tie = prev
        ? prev.score - (prev.interval95 ?? 0) <= r.score + interval
        : false
      return {
        rank: idx + 1,
        item,
        groupName: group?.name ?? '',
        groupColor: group ? colorFor(group.name, group.color) : colorFor(''),
        score: r.score,
        interval,
        comparisonCount: r.comparisonCount,
        tie,
      }
    })
    return { rows, unranked: collection.items.length - results.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rankMode,
    collection.items,
    session.comparisons,
    session.itemsById,
    groupById,
  ])

  // Album/group aggregation + per-group ranked tracks (only on the Albums tab).
  const albums = useMemo(() => {
    const empty = {
      rows: [] as AlbumRow[],
      tracksByGroup: new Map<string, AlbumTrack[]>(),
    }
    if (tab !== 'albums') return empty

    const model = albumMode === 'definitive' ? 'bradley-terry' : 'elo'
    const results = getModel(model).rank(
      collection.items.map((i) => i.id),
      session.comparisons,
    )

    const members: GroupMember[] = []
    const trackLists = new Map<string, AlbumTrack[]>()
    for (const r of results) {
      const item = session.itemsById.get(r.itemId)!
      const gid = item.groupId ?? ''
      const isBonus = item.metadata?.isBonus === true
      members.push({
        groupId: gid,
        score: r.score,
        interval95: r.interval95,
        excluded: !includeBonus && isBonus,
      })
      const list = trackLists.get(gid) ?? []
      list.push({
        rank: 0,
        itemId: r.itemId,
        name: item.name,
        score: r.score,
        isBonus,
        comparisonCount: r.comparisonCount,
      })
      trackLists.set(gid, list)
    }

    const tracksByGroup = new Map<string, AlbumTrack[]>()
    for (const [gid, list] of trackLists) {
      list.sort((a, b) => b.score - a.score)
      tracksByGroup.set(
        gid,
        list.map((t, i) => ({ ...t, rank: i + 1 })),
      )
    }

    const rows = aggregateByGroup(members, ALBUM_TOP_N).map((g) => {
      const group = groupById.get(g.groupId)
      return {
        groupId: g.groupId,
        name: group?.name ?? '',
        color: group ? colorFor(group.name, group.color) : colorFor(''),
        year: group?.metadata?.year as number | undefined,
        meanScore: g.mean.score,
        meanInterval: g.mean.interval95,
        topNScore: g.topN.score,
        topNInterval: g.topN.interval95,
        songCount: g.mean.count,
      }
    })

    const key = albumSort === 'mean' ? 'meanScore' : 'topNScore'
    rows.sort((a, b) => b[key] - a[key])
    return {
      rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
      tracksByGroup,
    }
  }, [
    tab,
    albumMode,
    albumSort,
    includeBonus,
    collection.items,
    session.comparisons,
    session.itemsById,
    groupById,
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
        `Clear all ${session.totalComparisons} comparisons for ${meta.name}? This cannot be undone.`,
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
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>
              {meta.name} · {comparisonLabel}
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
            <ThemeToggle theme={theme} onCycle={cycle} />
          </div>
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
            {labels.groupPlural}
          </TabButton>
          <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>
            Stats
          </TabButton>
        </nav>
      </header>

      {!session.loaded ? (
        <p className="text-center text-slate-500 dark:text-slate-400">
          Loading…
        </p>
      ) : tab === 'compare' ? (
        <CompareView
          pair={session.pair}
          onChoose={session.choose}
          onSkip={session.skip}
          onUndo={session.undo}
          canUndo={session.canUndo}
          albumLabel={compareLabel}
          albumColor={colorOf}
        />
      ) : tab === 'rankings' ? (
        <RankingsView
          mode={rankMode}
          onModeChange={setRankMode}
          liveRanking={session.ranking}
          definitiveRanking={definitive.rows}
          unrankedCount={definitive.unranked}
          totalComparisons={session.totalComparisons}
          labels={labels}
        />
      ) : tab === 'albums' ? (
        <AlbumsView
          mode={albumMode}
          onModeChange={setAlbumMode}
          includeBonus={includeBonus}
          onIncludeBonusChange={setIncludeBonus}
          showBonusToggle={hasBonus}
          sortBy={albumSort}
          onSortChange={setAlbumSort}
          topN={ALBUM_TOP_N}
          albums={albums.rows}
          tracksByGroup={albums.tracksByGroup}
          totalComparisons={session.totalComparisons}
          labels={labels}
        />
      ) : (
        stats && <StatsView stats={stats} labels={labels} />
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
