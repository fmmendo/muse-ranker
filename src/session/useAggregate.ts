import { useCallback, useEffect, useState } from 'react'
import type { CloudSync, AggregateResult } from '../data/cloudSync'

export interface AggregateState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  data?: AggregateResult
  error?: string
  /** Re-fetch the pooled aggregate. */
  refresh: () => void
}

/**
 * Fetch the crowd-wide aggregate from the cloud when `active` (e.g. the Global
 * view is showing). Cached until refreshed; no-op when sync is off.
 */
export function useAggregate(
  cloud: CloudSync | null,
  active: boolean,
): AggregateState {
  const [state, setState] = useState<Omit<AggregateState, 'refresh'>>({
    status: 'idle',
  })

  const refresh = useCallback(() => {
    if (!cloud) return
    setState({ status: 'loading' })
    cloud
      .fetchAggregate()
      .then((data) => setState({ status: 'ready', data }))
      .catch((e: unknown) =>
        setState({
          status: 'error',
          error: e instanceof Error ? e.message : 'error',
        }),
      )
  }, [cloud])

  useEffect(() => {
    // Kick off the fetch when the Global view activates (synchronising with the
    // cloud is exactly what an effect is for).
    // eslint-disable-next-line react/set-state-in-effect
    if (active && cloud && state.status === 'idle') refresh()
  }, [active, cloud, state.status, refresh])

  return { ...state, refresh }
}
