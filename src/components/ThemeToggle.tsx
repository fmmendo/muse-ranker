import type { Theme } from '../session/useTheme'

const ICON: Record<Theme, string> = {
  system: '🖥️',
  light: '☀️',
  dark: '🌙',
}
const NEXT: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}

interface ThemeToggleProps {
  theme: Theme
  onCycle: () => void
}

export function ThemeToggle({ theme, onCycle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}.`}
      title={`Theme: ${theme}`}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-sm transition hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500"
    >
      {ICON[theme]}
    </button>
  )
}
