import { useEffect } from 'react'
import type { Id, Item } from '../domain/types'

interface CompareViewProps {
  pair: [Item, Item]
  onChoose: (winnerId: Id, loserId: Id) => void
  onSkip: () => void
  albumLabel: (item: Item) => string
}

export function CompareView({
  pair,
  onChoose,
  onSkip,
  albumLabel,
}: CompareViewProps) {
  const [left, right] = pair

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '1' || e.key === 'ArrowLeft') {
        onChoose(left.id, right.id)
      } else if (e.key === '2' || e.key === 'ArrowRight') {
        onChoose(right.id, left.id)
      } else if (e.key === ' ' || e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSkip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [left, right, onChoose, onSkip])

  return (
    <section className="flex flex-col items-center gap-6">
      <h2 className="text-lg font-medium text-slate-500 dark:text-slate-400">
        Which do you prefer?
      </h2>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <ChoiceCard
          item={left}
          hint="1"
          albumLabel={albumLabel(left)}
          onClick={() => onChoose(left.id, right.id)}
        />
        <ChoiceCard
          item={right}
          hint="2"
          albumLabel={albumLabel(right)}
          onClick={() => onChoose(right.id, left.id)}
        />
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-slate-400 underline-offset-4 hover:text-slate-600 hover:underline dark:hover:text-slate-300"
      >
        Skip this pair (space)
      </button>
    </section>
  )
}

interface ChoiceCardProps {
  item: Item
  hint: string
  albumLabel: string
  onClick: () => void
}

function ChoiceCard({ item, hint, albumLabel, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Choose ${item.name}`}
      className="group relative flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-center transition hover:border-indigo-400 hover:shadow-lg focus-visible:border-indigo-500 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500"
    >
      <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-xs text-slate-400 dark:border-slate-700">
        {hint}
      </span>
      <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {item.name}
      </span>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {albumLabel}
      </span>
    </button>
  )
}
