import { useCallback, useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme'
const ORDER: Theme[] = ['system', 'light', 'dark']

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  )
}

export function resolveDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && prefersDark())
}

/** Apply the resolved theme to <html> by toggling the `.dark` class. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', resolveDark(theme))
}

export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system')
      return value
  } catch {
    // localStorage unavailable — fall through to default.
  }
  return 'system'
}

export interface ThemeControls {
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Advance system → light → dark → system. */
  cycle: () => void
}

export function useTheme(): ThemeControls {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore write failures
    }
    if (theme === 'system' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => applyTheme('system')
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
  }, [theme])

  const cycle = useCallback(() => {
    setTheme((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])
  }, [])

  return { theme, setTheme, cycle }
}
