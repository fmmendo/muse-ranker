import { useMemo, useState } from 'react'
import { muse } from './data/muse'
import { useRankingSession } from './session/useRankingSession'
import { CompareView } from './components/CompareView'
import { RankingsView } from './components/RankingsView'
import { albumColor } from './data/albumColors'
import type { RankerRepository } from './data/repository'
import type { Item } from './domain/types'

type Tab = 'compare' | 'rankings'

interface AppProps {
  /** Injectable for tests/previews; defaults to the Dexie-backed repository. */
  repository?: RankerRepository
}

function App({ repository }: AppProps = {}) {
  const session = useRankingSession(muse, undefined, repository)
  const [tab, setTab] = useState<Tab>('compare')

  const albumNameByGroupId = useMemo(
    () => new Map(muse.groups.map((g) => [g.id, g.name])),
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
      ) : (
        <RankingsView
          ranking={session.ranking}
          totalComparisons={session.totalComparisons}
        />
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
