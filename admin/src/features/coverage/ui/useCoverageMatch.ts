import { useEffect, useState } from 'react'
import type { CoverageEvent, CoverageMatch } from '../domain/coverageMatches.types'
import {
  refreshCoverageMatchDetails,
  subscribeCoverageEvents,
  subscribeCoverageMatch,
} from '../data/coverageMatches.service'

export function useCoverageMatch(matchId: string | undefined): {
  match: CoverageMatch | null
  events: CoverageEvent[]
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
} {
  const [match, setMatch] = useState<CoverageMatch | null>(null)
  const [events, setEvents] = useState<CoverageEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!matchId) {
      setMatch(null)
      setEvents([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    const unsubMatch = subscribeCoverageMatch(matchId, (m) => {
      if (!active) return
      setMatch(m)
      setLoading(false)
    })
    const unsubEvents = subscribeCoverageEvents(matchId, (list) => {
      if (active) setEvents(list)
    })
    return () => {
      active = false
      unsubMatch()
      unsubEvents()
    }
  }, [matchId])

  const refresh = async () => {
    const id = match?.fixtureId
    if (!id || refreshing) return
    setRefreshing(true)
    try {
      await refreshCoverageMatchDetails(id)
    } finally {
      setRefreshing(false)
    }
  }

  return { match, events, loading, refreshing, refresh }
}