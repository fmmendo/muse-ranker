import type { Id } from './types'

/**
 * Turn a human title into a URL/id-safe slug.
 *
 * Deterministic and stable: the same title always yields the same slug, which
 * lets us derive readable, reproducible ids for seed data (so re-seeding or
 * importing/exporting doesn't churn ids).
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // strip accents
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function collectionId(name: string): Id {
  return `col:${slugify(name)}`
}

export function groupId(collectionName: string, groupName: string): Id {
  return `grp:${slugify(collectionName)}:${slugify(groupName)}`
}

export function itemId(
  collectionName: string,
  groupName: string,
  itemName: string,
): Id {
  return `itm:${slugify(collectionName)}:${slugify(groupName)}:${slugify(itemName)}`
}
