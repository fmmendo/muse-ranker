// Colour for a group. Uses the dataset-provided colour when present, otherwise
// derives a stable, well-spread hue by hashing the group's name — so any dataset
// gets distinct group colours for free without hardcoding.

const FALLBACK_SATURATION = 62
const FALLBACK_LIGHTNESS = 55

function hashHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  // Multiply by the golden-angle-ish step to spread similar names apart.
  return (hash * 137) % 360
}

export function colorFor(name: string, explicit?: string): string {
  if (explicit) return explicit
  return `hsl(${hashHue(name)} ${FALLBACK_SATURATION}% ${FALLBACK_LIGHTNESS}%)`
}
