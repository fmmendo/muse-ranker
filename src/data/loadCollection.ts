import { buildCollection, type BuiltCollection } from './buildCollection'
import { parseDataset, datasetToSeed } from './dataset'

/** URL of the active dataset (base-path aware for GitHub Pages). */
export const DATASET_URL = `${import.meta.env.BASE_URL}datasets/muse.json`

/** Directory portion of a URL (everything up to and including the last "/"). */
function baseDirOf(url: string): string {
  const slash = url.lastIndexOf('/')
  return slash === -1 ? '' : url.slice(0, slash + 1)
}

/**
 * Fetch, validate and build a collection from a dataset JSON file. Image URIs in
 * the dataset are resolved relative to the JSON's own directory.
 */
export async function loadCollection(
  url: string = DATASET_URL,
): Promise<BuiltCollection> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load dataset (${response.status}) from ${url}`)
  }
  const raw: unknown = await response.json()
  const dataset = parseDataset(raw)
  return buildCollection(datasetToSeed(dataset, baseDirOf(url)))
}
