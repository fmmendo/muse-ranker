import { muse } from './data/muse'

function App() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 px-6 py-12 text-slate-900 dark:text-slate-100">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">
          Preference Ranker
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          {muse.collection.name} — {muse.items.length} songs across{' '}
          {muse.groups.length} albums.
        </p>
      </header>

      <ul className="flex flex-col gap-1">
        {muse.groups.map((album) => {
          const count = muse.items.filter((i) => i.groupId === album.id).length
          return (
            <li
              key={album.id}
              className="flex items-baseline justify-between border-b border-slate-200 py-1.5 dark:border-slate-800"
            >
              <span>
                {album.name}{' '}
                <span className="text-slate-400">
                  ({String(album.metadata?.year)})
                </span>
              </span>
              <span className="text-slate-500 tabular-nums dark:text-slate-400">
                {count} songs
              </span>
            </li>
          )
        })}
      </ul>

      <p className="text-sm text-slate-400">Milestone 2 — data model loaded.</p>
    </main>
  )
}

export default App
