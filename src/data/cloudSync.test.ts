import { createCloudSync } from './cloudSync'
import type { Comparison } from '../domain/types'

const cmp = (id: string, a: string, b: string, w: string): Comparison => ({
  id,
  collectionId: 'col:muse',
  itemAId: a,
  itemBId: b,
  winnerId: w,
  timestamp: '2026-08-23T12:00:00.000Z',
})

interface Call {
  url: string
  init?: RequestInit
}

function mockFetch(json: unknown = { pairs: [], users: 3 }, ok = true) {
  const calls: Call[] = []
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => json,
    } as Response
  }) as unknown as typeof fetch
  return { calls, impl }
}

const opts = (fetchImpl: typeof fetch) => ({
  baseUrl: 'https://api.example/',
  collectionId: 'col:muse',
  userId: 'u1',
  fetchImpl,
})

describe('createCloudSync', () => {
  it('POSTs comparisons with userId and a normalised, encoded URL', async () => {
    const { calls, impl } = mockFetch()
    await createCloudSync(opts(impl)).pushComparisons([
      cmp('c1', 'a', 'b', 'a'),
    ])
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.example/c/col%3Amuse/comparisons')
    const body = JSON.parse(calls[0].init!.body as string)
    expect(body.userId).toBe('u1')
    expect(body.comparisons[0]).toMatchObject({
      id: 'c1',
      itemAId: 'a',
      itemBId: 'b',
      winnerId: 'a',
    })
  })

  it('does nothing for an empty push', async () => {
    const { calls, impl } = mockFetch()
    await createCloudSync(opts(impl)).pushComparisons([])
    expect(calls).toHaveLength(0)
  })

  it('batches pushes over 500', async () => {
    const { calls, impl } = mockFetch()
    const many = Array.from({ length: 600 }, (_, i) =>
      cmp(`c${i}`, 'a', 'b', 'a'),
    )
    await createCloudSync(opts(impl)).pushComparisons(many)
    expect(calls).toHaveLength(2) // 500 + 100
  })

  it('DELETEs by id with the userId query', async () => {
    const { calls, impl } = mockFetch()
    await createCloudSync(opts(impl)).deleteComparison('c1')
    expect(calls[0].init!.method).toBe('DELETE')
    expect(calls[0].url).toContain('/comparisons/c1?userId=u1')
  })

  it('resets for the user', async () => {
    const { calls, impl } = mockFetch()
    await createCloudSync(opts(impl)).reset()
    expect(calls[0].url).toBe('https://api.example/c/col%3Amuse/reset')
    expect(JSON.parse(calls[0].init!.body as string)).toEqual({ userId: 'u1' })
  })

  it('reads the aggregate', async () => {
    const { impl } = mockFetch({ pairs: [], users: 7 })
    const agg = await createCloudSync(opts(impl)).fetchAggregate()
    expect(agg.users).toBe(7)
  })

  it('throws when the aggregate request fails', async () => {
    const { impl } = mockFetch({}, false)
    await expect(createCloudSync(opts(impl)).fetchAggregate()).rejects.toThrow(
      /aggregate failed/,
    )
  })
})
