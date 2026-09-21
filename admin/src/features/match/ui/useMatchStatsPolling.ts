import { useCallback, useEffect, useRef, useState } from 'react'
import type { Match } from '../domain/match.types'

import { fetchAndSaveMatchPlayerStatistics, fetchAndSaveMatchStatistics } from '../data/match.service'

const POLL_INTERVAL_MS = 10_000

export interface MatchStatsPollingState {
  refreshing: boolean
  lastFetchedAt: number | null
  refresh: () => void
}

export function useMatchStatsPolling(match: Match | null | undefined): MatchStatsPollingState {
  const inFlight = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)
  const matchRef = useRef<Match | null>(null)
  matchRef.current = match ?? null

  const tick = useCallback(async () => {
    const m = matchRef.current
    if (!m?.fixtureId || inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    try {
      const [statsCount, playerCount] = await Promise.all([
        fetchAndSaveMatchStatistics(m, { silent: true }),
        fetchAndSaveMatchPlayerStatistics(m),
      ])
      if (statsCount + playerCount > 0) setLastFetchedAt(Date.now())
    } catch {
      // transient API/network errors are swallowed; next tick retries
    } finally {
      inFlight.current = false
      setRefreshing(false)
    }
  }, [])

  const refresh = useCallback(() => {
    void tick()
  }, [tick])

  useEffect(() => {
    if (!match?.fixtureId || match.status === 'not_started') return

    if (match.status === 'final') {
      void tick()
      return
    }

    void tick()
    const interval = window.setInterval(() => void tick(), POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [match?.id, match?.fixtureId, match?.status, tick])

  return { refreshing, lastFetchedAt, refresh }
}