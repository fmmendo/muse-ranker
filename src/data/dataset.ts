import type { GroupedCollectionSeed } from './buildCollection'

// The on-disk dataset format (fetched from public/datasets/*.json). Mirrors the
// generic collection → groups → items shape, enriched with UI labels,
// descriptions, per-group colours, and image URIs. Kept separate from the
// internal seed/entity types so the file format can evolve independently.

export interface DatasetLabels {
  label: string
  labelPlural?: string
}

export interface DatasetItem {
  name: string
  description?: string
  image?: string
  metadata?: Record<string, unknown>
}

export interface DatasetGroup {
  name: string
  description?: string
  color?: string
  image?: string
  metadata?: Record<string, unknown>
  items: DatasetItem[]
}

export interface Dataset {
  version: number
  name: string
  description?: string
  group?: DatasetLabels
  item?: DatasetLabels
  groups: DatasetGroup[]
}

function fail(message: string): never {
  throw new Error(`Invalid dataset: ${message}`)
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${path} must be a non-empty string`)
  }
  return value
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') fail(`${path} must be a string`)
  return value
}

/** Validate untrusted JSON into a Dataset, throwing a clear error on any problem. */
export function parseDataset(raw: unknown): Dataset {
  if (typeof raw !== 'object' || raw === null) fail('root must be an object')
  const obj = raw as Record<string, unknown>

  if (typeof obj.version !== 'number') fail('version must be a number')
  const name = asString(obj.name, 'name')
  if (!Array.isArray(obj.groups) || obj.groups.length === 0) {
    fail('groups must be a non-empty array')
  }

  const parseLabels = (
    value: unknown,
    path: string,
  ): DatasetLabels | undefined => {
    if (value === undefined) return undefined
    if (typeof value !== 'object' || value === null)
      fail(`${path} must be an object`)
    const l = value as Record<string, unknown>
    return {
      label: asString(l.label, `${path}.label`),
      labelPlural: optionalString(l.labelPlural, `${path}.labelPlural`),
    }
  }

  const groups: DatasetGroup[] = obj.groups.map((g, gi) => {
    if (typeof g !== 'object' || g === null)
      fail(`groups[${gi}] must be an object`)
    const group = g as Record<string, unknown>
    if (!Array.isArray(group.items) || group.items.length === 0) {
      fail(`groups[${gi}].items must be a non-empty array`)
    }
    return {
      name: asString(group.name, `groups[${gi}].name`),
      description: optionalString(
        group.description,
        `groups[${gi}].description`,
      ),
      color: optionalString(group.color, `groups[${gi}].color`),
      image: optionalString(group.image, `groups[${gi}].image`),
      metadata: (group.metadata as Record<string, unknown>) ?? undefined,
      items: group.items.map((it, ii) => {
        if (typeof it !== 'object' || it === null) {
          fail(`groups[${gi}].items[${ii}] must be an object`)
        }
        const item = it as Record<string, unknown>
        return {
          name: asString(item.name, `groups[${gi}].items[${ii}].name`),
          description: optionalString(
            item.description,
            `groups[${gi}].items[${ii}].description`,
          ),
          image: optionalString(item.image, `groups[${gi}].items[${ii}].image`),
          metadata: (item.metadata as Record<string, unknown>) ?? undefined,
        }
      }),
    }
  })

  return {
    version: obj.version,
    name,
    description: optionalString(obj.description, 'description'),
    group: parseLabels(obj.group, 'group'),
    item: parseLabels(obj.item, 'item'),
    groups,
  }
}

/** Resolve a possibly-relative image URI against the dataset's base directory. */
export function resolveImage(
  image: string | undefined,
  baseDir: string,
): string | undefined {
  if (!image) return undefined
  if (/^https?:\/\//i.test(image) || image.startsWith('/')) return image
  return baseDir + image
}

/** Convert a validated Dataset into the internal seed, resolving image URIs. */
export function datasetToSeed(
  dataset: Dataset,
  baseDir = '',
): GroupedCollectionSeed {
  return {
    name: dataset.name,
    description: dataset.description,
    groupLabel: dataset.group?.label,
    groupLabelPlural: dataset.group?.labelPlural,
    itemLabel: dataset.item?.label,
    itemLabelPlural: dataset.item?.labelPlural,
    groups: dataset.groups.map((group) => ({
      name: group.name,
      description: group.description,
      color: group.color,
      image: resolveImage(group.image, baseDir),
      metadata: group.metadata,
      items: group.items.map((item) => ({
        name: item.name,
        description: item.description,
        image: resolveImage(item.image, baseDir),
        metadata: item.metadata,
      })),
    })),
  }
}
