import { useMemo, useState } from 'react'
import { muse } from './data/muse'
import { useRankingSession } from './session/useRankingSession'
import { CompareView } from './components/CompareView'
import { RankingsView } from './components/RankingsView'
import { albumColor } from './data/albumColors'
import type { Item } from './domain/types'

type Tab = 'compare' | 'rankings'

function App() {
  const session = useRankingSession(muse)
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

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 px-6 py-10 text-slate-900 dark:text-slate-100">
      <header className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Preference Ranker
          </h1>
          <span className="text-sm text-slate-400">
            {muse.collection.name} · {comparisonLabel}
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

      {tab === 'compare' ? (
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
