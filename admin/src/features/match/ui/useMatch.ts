import { useEffect, useReducer, useState } from 'react'
import type { MatchWithPlans } from '../domain/match.types'
import { subscribeMatch } from '../data/match.service'

export function useMatch(matchId?: string): { match: MatchWithPlans | null; loading: boolean } {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const [match, setMatch] = useState<MatchWithPlans | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!matchId) { setMatch(null); setLoading(false); return }
    setLoading(true)
    return subscribeMatch(matchId, (data) => {
      setMatch(data as MatchWithPlans)
      setLoading(false)
      force()
    })
  }, [matchId, force])

  return { match, loading }
}
