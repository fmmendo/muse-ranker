// A distinct, well-separated colour per Muse album. Chosen to read clearly in
// both light and dark themes. Keyed by album name; falls back to a neutral slate
// for anything unmapped. (Album artwork is a late-game nice-to-have.)

export const ALBUM_COLORS: Record<string, string> = {
  Showbiz: '#6366f1', // indigo
  'Origin of Symmetry': '#06b6d4', // cyan
  Absolution: '#ef4444', // red
  'Black Holes and Revelations': '#a855f7', // violet
  'The Resistance': '#f59e0b', // amber
  'The 2nd Law': '#22c55e', // green
  Drones: '#71717a', // zinc
  'Simulation Theory': '#ec4899', // pink
  'Will of the People': '#f97316', // orange
  'The Wow! Signal': '#84cc16', // lime
}

const FALLBACK_COLOR = '#94a3b8' // slate-400

export function albumColor(albumName: string): string {
  return ALBUM_COLORS[albumName] ?? FALLBACK_COLOR
}
